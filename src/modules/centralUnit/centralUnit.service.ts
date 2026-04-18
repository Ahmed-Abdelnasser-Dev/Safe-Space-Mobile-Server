import { createCentralUnitClient } from "./centralUnit.client.js";

import { getEnv } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import type {
  AccidentMediaInput,
  GeoLocation,
  NotificationDataValue,
} from "../../types/index.js";
import type { AppError } from "../../types/errors.js";

type SendAccidentToCentralUnitInput = {
  accidentId: string;
  description: string;
  latitude: number;
  longitude: number;
  severity: "low" | "medium" | "high";
  media: AccidentMediaInput[];
};

type ReceiveAccidentFromCentralUnitInput = {
  centralUnitAccidentId: string;
  occurredAt: string;
  location: GeoLocation;
};

type CentralUnitRepo = {
  findAccidentById: (accidentId: string) => Promise<{ id: string } | null>;
  markAccidentSentToCentralUnit: (
    accidentId: string,
    centralUnitReferenceId: string,
  ) => Promise<{ id: string; centralUnitReferenceId: string | null }>;
  createInboundCentralUnitAccident: (input: {
    centralUnitAccidentId: string;
    occurredAt: Date;
    lat: number;
    lng: number;
  }) => Promise<{ id: string }>;
  getActiveUsersWithFcmTokens: () => Promise<string[]>;
};

type NotificationsService = {
  sendAccidentNotification?: (input: {
    accidentId: string;
    userIds: string[];
    title: string;
    body: string;
    streetName?: string;
    data?: Record<string, NotificationDataValue>;
  }) => Promise<{ ok: true; sent: number; failed: number }>;
};

type CentralUnitService = {
  sendAccidentToCentralUnit: (
    input: SendAccidentToCentralUnitInput,
  ) => Promise<{ ok: true; centralUnitReferenceId: string } | { ok: false; reason: "not_configured" }>;
  receiveAccidentFromCentralUnit: (
    input: ReceiveAccidentFromCentralUnitInput,
  ) => Promise<{ ok: true }>;
};

export function createCentralUnitService({
  centralUnitRepo,
  notificationsService,
}: {
  centralUnitRepo: CentralUnitRepo;
  notificationsService?: NotificationsService;
}): CentralUnitService {
  const env = getEnv();
  const client = env.CENTRAL_UNIT_BASE_URL
    ? createCentralUnitClient({ baseUrl: env.CENTRAL_UNIT_BASE_URL })
    : null;

  return {
    async sendAccidentToCentralUnit({
      accidentId,
      description,
      latitude,
      longitude,
      severity,
      media,
    }) {
      if (!client) {
        logger.info(
          { accidentId },
          "Central Unit URL not configured, skipping send",
        );
        return { ok: false, reason: "not_configured" };
      }

      // Optionally validate the accident exists
      const existing = await centralUnitRepo.findAccidentById(accidentId);
      if (!existing) {
        const err = new Error("Accident not found") as AppError;
        err.statusCode = 404;
        err.expose = true;
        err.code = "NOT_FOUND";
        throw err;
      }

      const resp = await client.sendAccident(
        {
          accidentId,
          description,
          latitude,
          longitude,
          severity,
          media,
        },
        { idempotencyKey: accidentId },
      );

      const ref =
        resp?.centralUnitReferenceId ||
        resp?.referenceId ||
        resp?.id ||
        "unknown";
      await centralUnitRepo.markAccidentSentToCentralUnit(
        accidentId,
        String(ref),
      );
      return { ok: true, centralUnitReferenceId: String(ref) };
    },

    async receiveAccidentFromCentralUnit({
      centralUnitAccidentId,
      occurredAt,
      location,
    }) {
      const created = await centralUnitRepo.createInboundCentralUnitAccident({
        centralUnitAccidentId,
        occurredAt: new Date(occurredAt),
        lat: location.lat,
        lng: location.lng,
      });

      // Get all users with active FCM tokens to notify them
      // In a future enhancement, we can filter by location (geo-fencing)
      let impactedUsers: string[] = [];
      try {
        impactedUsers = await centralUnitRepo.getActiveUsersWithFcmTokens();
        logger.info(
          { accidentId: created.id, userCount: impactedUsers.length },
          "Found active users to notify about accident"
        );
      } catch (err) {
        logger.warn(
          { err, accidentId: created.id },
          "Failed to fetch active users for notification"
        );
      }

      // Send notification to all active users about the accident
      if (notificationsService?.sendAccidentNotification && impactedUsers.length > 0) {
        try {
          const notificationResult = await notificationsService.sendAccidentNotification({
            accidentId: created.id,
            userIds: impactedUsers,
            title: "Accident Nearby",
            body: "An accident has been reported in your area. Please stay alert.",
            data: {
              type: "ACCIDENT",
              accidentId: created.id,
              lat: String(location.lat),
              lng: String(location.lng),
              source: "CENTRAL_UNIT",
            },
          });

          if (notificationResult.failed > 0) {
            logger.warn(
              {
                accidentId: created.id,
                userCount: impactedUsers.length,
                sent: notificationResult.sent,
                failed: notificationResult.failed,
              },
              notificationResult.sent > 0
                ? "Accident notification partially sent to users"
                : "Accident notification failed for all users"
            );
          } else {
            logger.info(
              {
                accidentId: created.id,
                userCount: impactedUsers.length,
                sent: notificationResult.sent,
                failed: notificationResult.failed,
              },
              "Accident notification sent to users"
            );
          }
        } catch (err) {
          logger.error(
            { err, accidentId: created.id },
            "Failed to send accident notification"
          );
        }
      }

      return { ok: true };
    },
  };
}

import { AccidentSource } from "@prisma/client";
import { logger } from "../../utils/logger.js";
import type {
  AccidentMediaInput,
  GeoLocation,
  NotificationDataValue,
} from "../../types/index.js";

type AccidentCreateInput = {
  reporterUserId: string | null;
  source: AccidentSource;
  occurredAt: Date;
  lat: number;
  lng: number;
  message: string | null;
  description: string | null;
  severity: string;
  media: AccidentMediaInput[];
  status: string;
};

type AccidentsRepo = {
  createAccident: (input: AccidentCreateInput) => Promise<{ id: string }>;
  getActiveUsersWithFcmTokens: (excludeUserId?: string | null) => Promise<string[]>;
};

type CentralUnitService = {
  sendAccidentToCentralUnit?: (input: {
    accidentId: string;
    description: string;
    latitude: number;
    longitude: number;
    severity: string;
    media: AccidentMediaInput[];
  }) => Promise<unknown>;
};

type NotificationsService = {
  sendAccidentNotification?: (input: {
    accidentId: string;
    userIds: string[];
    title: string;
    body: string;
    streetName?: string | null;
    data?: Record<string, NotificationDataValue>;
  }) => Promise<{ ok: true; sent: number; failed: number }>;
};

type ReportAccidentCommand = {
  reporterUserId: string | null;
  location: GeoLocation;
  message?: string;
  occurredAt: string;
  media?: AccidentMediaInput[];
};

type AccidentsService = {
  reportAccident: (input: ReportAccidentCommand) => Promise<{ accidentId: string; status: "received" }>;
};

export function haversineMeters(a: GeoLocation, b: GeoLocation): number {
  const R = 6371000;
  const toRad = (deg: number): number => (deg * Math.PI) / 180;

  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * (sinDLng * sinDLng);

  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isInRange(
  a: GeoLocation,
  b: GeoLocation,
  radiusMeters: number,
): boolean {
  return haversineMeters(a, b) <= radiusMeters;
}

export function createAccidentsService({
  accidentsRepo,
  centralUnitService,
  notificationsService,
}: {
  accidentsRepo: AccidentsRepo;
  centralUnitService?: CentralUnitService;
  notificationsService?: NotificationsService;
}): AccidentsService {
  return {
    async reportAccident({
      reporterUserId,
      location,
      message,
      occurredAt,
      media,
    }: ReportAccidentCommand) {
      const created = await accidentsRepo.createAccident({
        reporterUserId,
        source: AccidentSource.MOBILE,
        occurredAt: new Date(occurredAt),
        lat: location.lat,
        lng: location.lng,
        message: message || null,
        description: message || null,
        severity: "low",
        media: media || [],
        status: "RECEIVED",
      });

      // Best-effort: Send to Central Unit for coordination and additional processing
      if (centralUnitService?.sendAccidentToCentralUnit) {
        centralUnitService
          .sendAccidentToCentralUnit({
            accidentId: created.id,
            description: message || "Accident reported from mobile app",
            latitude: location.lat,
            longitude: location.lng,
            severity: "low",
            media: media || [],
          })
          .catch((err: unknown) => {
            logger.warn(
              { err, accidentId: created.id },
              "failed to send accident to Central Unit (will not fail user request)"
            );
          });
      }

      // Best-effort: Notify other mobile users about the reported accident
      if (notificationsService?.sendAccidentNotification) {
        try {
          // Get all active users with FCM tokens (excluding the reporter)
          const activeUsers = await accidentsRepo.getActiveUsersWithFcmTokens(reporterUserId);

          if (activeUsers.length > 0) {
            const notificationResult = await notificationsService.sendAccidentNotification({
              accidentId: created.id,
              userIds: activeUsers,
              title: "Accident Report",
              body: message || "An accident has been reported nearby",
              streetName: null,
              data: {
                type: "ACCIDENT",
                accidentId: created.id,
                lat: String(location.lat),
                lng: String(location.lng),
                source: "MOBILE_USER",
                message: message || null,
              },
            });

            if (notificationResult.failed > 0) {
              logger.warn(
                {
                  accidentId: created.id,
                  userCount: activeUsers.length,
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
                  userCount: activeUsers.length,
                  sent: notificationResult.sent,
                  failed: notificationResult.failed,
                },
                "Accident notification sent to users"
              );
            }
          }
        } catch (err) {
          logger.warn(
            { err, accidentId: created.id },
            "failed to send accident notification to mobile users"
          );
        }
      }

      return { accidentId: created.id, status: "received" };
    },
  };
}


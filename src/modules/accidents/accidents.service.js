import { AccidentSource } from "@prisma/client";
import { logger } from "../../utils/logger.js";

/**
 * @typedef {import("../../types/index").GeoLocation} GeoLocation
 */

/**
 * @typedef {{
 *   reporterUserId: string | null,
 *   source: import("@prisma/client").AccidentSource,
 *   occurredAt: Date,
 *   lat: number,
 *   lng: number,
 *   message: string | null,
 *   description: string | null,
 *   severity: string,
 *   media: import("../../types/index").AccidentMediaInput[],
 *   status: string
 * }} AccidentCreateInput
 */

/**
 * @typedef {{
 *   createAccident: (input: AccidentCreateInput) => Promise<{ id: string }>,
 *   getActiveUsersWithFcmTokens: (excludeUserId?: string | null) => Promise<string[]>
 * }} AccidentsRepo
 */

/**
 * @typedef {{
 *   sendAccidentToCentralUnit?: (input: {
 *     accidentId: string,
 *     description: string,
 *     latitude: number,
 *     longitude: number,
 *     severity: string,
 *     media: import("../../types/index").AccidentMediaInput[]
 *   }) => Promise<unknown>
 * }} CentralUnitService
 */

/**
 * @typedef {{
 *   sendAccidentNotification?: (input: {
 *     accidentId: string,
 *     userIds: string[],
 *     title: string,
 *     body: string,
 *     streetName?: string | null,
 *     data?: Record<string, import("../../types/index").NotificationDataValue>
 *   }) => Promise<unknown>
 * }} NotificationsService
 */

/**
 * @typedef {{
 *   reporterUserId: string | null,
 *   location: GeoLocation,
 *   message?: string,
 *   occurredAt: string,
 *   media?: import("../../types/index").AccidentMediaInput[]
 * }} ReportAccidentCommand
 */

/**
 * @param {GeoLocation} a
 * @param {GeoLocation} b
 * @returns {number}
 */
export function haversineMeters(a, b) {
  const R = 6371000;
  /** @param {number} deg */
  const toRad = (deg) => (deg * Math.PI) / 180;

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

/**
 * @param {GeoLocation} a
 * @param {GeoLocation} b
 * @param {number} radiusMeters
 * @returns {boolean}
 */
export function isInRange(a, b, radiusMeters) {
  return haversineMeters(a, b) <= radiusMeters;
}

/**
 * @param {{
 *   accidentsRepo: AccidentsRepo,
 *   centralUnitService?: CentralUnitService,
 *   notificationsService?: NotificationsService
 * }} deps
 */
export function createAccidentsService({ accidentsRepo, centralUnitService, notificationsService }) {
  return {
    /**
     * @param {ReportAccidentCommand} input
     * @returns {Promise<{ accidentId: string, status: "received" }>}
     */
    async reportAccident({ reporterUserId, location, message, occurredAt, media }) {
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
          .catch((err) => {
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
            await notificationsService.sendAccidentNotification({
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

            logger.info(
              { accidentId: created.id, userCount: activeUsers.length },
              "Accident notification sent to users"
            );
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


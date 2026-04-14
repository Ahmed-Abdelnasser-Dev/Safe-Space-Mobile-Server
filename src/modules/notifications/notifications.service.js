import { createFcmProvider } from "./fcm.provider.js";
import { buildAccidentNotificationPayload } from "./application/notifications.payload.js";

/**
 * @typedef {{
 *   notificationLog: {
 *     createMany: (input: { data: Array<{ accidentId: string, userId: string, provider: string, status: string, error: string | null }> }) => Promise<unknown>
 *   }
 * }} NotificationsPrisma
 */

/**
 * @typedef {{
 *   sendToUsers: (input: {
 *     userIds: string[],
 *     title: string,
 *     body: string,
 *     data: Record<string, import("../../types/index").NotificationDataValue | string>
 *   }) => Promise<{ sent: number, failed: number, failures: Array<{ userId: string, error?: string }> }>
 * }} NotificationsProvider
 */

/**
 * @param {{ prisma: NotificationsPrisma, provider?: NotificationsProvider }} deps
 */
export function createNotificationsService({ prisma, provider = createFcmProvider(prisma) }) {
  return {
    /**
     * @param {{
     *   accidentId: string,
     *   userIds: string[],
     *   title: string,
     *   body: string,
     *   streetName?: string,
     *   data?: Record<string, import("../../types/index").NotificationDataValue>
     * }} input
     */
    async sendAccidentNotification({ accidentId, userIds, title, body, streetName, data }) {
      const payload = buildAccidentNotificationPayload({
        accidentId,
        streetName,
        data,
      });

      const result = await provider.sendToUsers({ userIds, title, body, data: payload });

      // Best-effort logging
      try {
        await prisma.notificationLog.createMany({
          data: userIds.map((userId) => ({
            accidentId,
            userId,
            provider: "FCM",
            status: result.failures.some((f) => f.userId === userId)
              ? "FAILED"
              : "SENT",
            error: result.failures
              .find((f) => f.userId === userId)
              ?.error || null,
          })),
        });
      } catch {
        // ignore logging failures
      }

      return { ok: true, sent: result.sent, failed: result.failed };
    },
  };
}


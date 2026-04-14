import { createFcmProvider } from "./fcm.provider.js";
import { buildAccidentNotificationPayload } from "./application/notifications.payload.js";

export function createNotificationsService({ prisma, provider = createFcmProvider(prisma) }) {
  return {
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


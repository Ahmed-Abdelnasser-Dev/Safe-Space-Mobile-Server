import { createFcmProvider } from "./fcm.provider.js";
import { buildAccidentNotificationPayload } from "./application/notifications.payload.js";
import type { NotificationDataValue } from "../../types/index.js";

type NotificationsPrisma = {
  notificationLog: {
    createMany: (input: {
      data: Array<{
        accidentId: string;
        userId: string;
        provider: string;
        status: string;
        error: string | null;
      }>;
    }) => Promise<unknown>;
  };
  session: {
    findMany: (input: unknown) => Promise<Array<{ id: string; fcmToken: string; deviceId: string | null }>>;
    update: (input: unknown) => Promise<unknown>;
  };
};

type NotificationsProvider = {
  sendToUsers: (input: {
    userIds: string[];
    title: string;
    body: string;
    data: Record<string, NotificationDataValue | string>;
  }) => Promise<{ sent: number; failed: number; failures: Array<{ userId: string; error?: string }> }>;
};

type SendAccidentNotificationInput = {
  accidentId: string;
  userIds: string[];
  title: string;
  body: string;
  streetName?: string;
  data?: Record<string, NotificationDataValue>;
};

type NotificationsService = {
  sendAccidentNotification: (input: SendAccidentNotificationInput) => Promise<{ ok: true; sent: number; failed: number }>;
};

export function createNotificationsService({
  prisma,
  provider,
}: {
  prisma: NotificationsPrisma;
  provider?: NotificationsProvider;
}): NotificationsService {
  const resolvedProvider = provider ?? createFcmProvider(prisma);

  return {
    async sendAccidentNotification({
      accidentId,
      userIds,
      title,
      body,
      streetName,
      data,
    }: SendAccidentNotificationInput) {
      const payload = buildAccidentNotificationPayload({
        accidentId,
        streetName,
        data,
      });

      const result = await resolvedProvider.sendToUsers({ userIds, title, body, data: payload });

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


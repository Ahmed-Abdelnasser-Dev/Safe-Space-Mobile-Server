import { sendAccidentNotificationSchema } from "./notifications.validators.js";
import { canSendAccidentNotification } from "./application/notifications.access-policy.js";
import { parseSendAccidentNotificationRequest } from "./application/notifications.request-parser.js";
import type { RequestHandler } from "express";
import type { NotificationDataValue } from "../../types/index.js";

type NotificationsService = {
  sendAccidentNotification: (input: {
    accidentId: string;
    userIds: string[];
    title: string;
    body: string;
    streetName?: string;
    data?: Record<string, NotificationDataValue>;
  }) => Promise<{ ok: true; sent: number; failed: number }>;
};

type NotificationsController = {
  sendAccidentNotification: RequestHandler;
};

export function createNotificationsController({
  notificationsService,
}: {
  notificationsService: NotificationsService;
}): NotificationsController {
  return {
    sendAccidentNotification: async (req, res, next) => {
      try {
        if (!canSendAccidentNotification(req.userRole)) {
          return res.status(403).json({
            success: false,
            message: "Forbidden",
          });
        }

        const rawBody = sendAccidentNotificationSchema.parse(req.body);
        const parsedBody = parseSendAccidentNotificationRequest(rawBody);
        const result = await notificationsService.sendAccidentNotification(parsedBody);
        return res.status(200).json(result);
      } catch (err) {
        return next(err);
      }
    },
  };
}


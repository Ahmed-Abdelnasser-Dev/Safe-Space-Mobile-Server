import { sendAccidentNotificationSchema } from "./notifications.validators.js";
import { canSendAccidentNotification } from "./application/notifications.access-policy.js";
import { parseSendAccidentNotificationRequest } from "./application/notifications.request-parser.js";

export function createNotificationsController({ notificationsService }) {
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
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },
  };
}


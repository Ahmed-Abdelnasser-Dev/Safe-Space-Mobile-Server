import { Router } from "express";
import type { RequestHandler } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";

type NotificationsController = {
  sendAccidentNotification: RequestHandler;
};

export function createNotificationsRouter({
  notificationsController,
}: {
  notificationsController: NotificationsController;
}) {
  const notificationsRouter = Router();

  notificationsRouter.post(
    "/notifications/send-accident-notification",
    requireAuth,
    notificationsController.sendAccidentNotification
  );

  return notificationsRouter;
}


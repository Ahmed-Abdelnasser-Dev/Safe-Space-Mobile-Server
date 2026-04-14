import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";

/**
 * @typedef {{
 *   sendAccidentNotification: import("express").RequestHandler
 * }} NotificationsController
 */

/**
 * @param {{ notificationsController: NotificationsController }} deps
 */
export function createNotificationsRouter({ notificationsController }) {
  const notificationsRouter = Router();

  notificationsRouter.post(
    "/notifications/send-accident-notification",
    requireAuth,
    notificationsController.sendAccidentNotification
  );

  return notificationsRouter;
}


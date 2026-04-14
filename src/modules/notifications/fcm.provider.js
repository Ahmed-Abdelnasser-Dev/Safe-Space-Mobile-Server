import admin from "firebase-admin";
import pino from "pino";
import fs from "node:fs";
import path from "node:path";

const logger = pino();

/**
 * @typedef {{
 *   session: {
 *     findMany: (input: {
 *       where: {
 *         userId: string,
 *         revokedAt: null,
 *         fcmToken: { not: null },
 *         expiresAt: { gt: Date }
 *       },
 *       select: { id: true, fcmToken: true, deviceId: true }
 *     }) => Promise<Array<{ id: string, fcmToken: string, deviceId: string | null }>>,
 *     update: (input: { where: { id: string }, data: { revokedAt: Date } }) => Promise<unknown>
 *   }
 * }} FcmPrismaLike
 */

/**
 * Initialize Firebase Admin SDK if not already initialized
 * @returns {admin.app.App} Firebase app instance
 */
async function initializeFirebaseAdmin() {
  // Check if Firebase is already initialized
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // Ensure service account credentials are available
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!serviceAccountPath) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_PATH environment variable is not set"
    );
  }

  try {
    // Resolve to absolute path
    const absolutePath = path.isAbsolute(serviceAccountPath)
      ? serviceAccountPath
      : path.join(process.cwd(), serviceAccountPath);

    // Read and parse the service account file
    const serviceAccountJson = fs.readFileSync(absolutePath, "utf-8");
    const serviceAccount = JSON.parse(serviceAccountJson);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });

    logger.info(
      `Firebase Admin SDK initialized with project: ${process.env.FIREBASE_PROJECT_ID}`
    );
    return admin.app();
  } catch (error) {
    logger.error(
      `Failed to initialize Firebase Admin SDK: ${error.message}`
    );
    throw error;
  }
}

/**
 * Creates an FCM provider for sending push notifications
 * @param {FcmPrismaLike | undefined} prisma - Prisma client instance (optional, for fetching FCM tokens)
 * @returns {{
 *   sendToUsers: (params: {
 *     userIds: string[],
 *     title: string,
 *     body: string,
 *     data: Record<string, import("../../types/index").NotificationDataValue | string>
 *   }) => Promise<{ sent: number, failed: number, failures: Array<{ userId: string, deviceId?: string | null, error: string | undefined }> }>
 * }} FCM provider with sendToUsers method
 */
export function createFcmProvider(prisma) {
  return {
    /**
     * Send notification to multiple users via FCM
     * @param {Object} params - Parameters object
     * @param {string[]} params.userIds - Array of user IDs to send to
     * @param {string} params.title - Notification title
     * @param {string} params.body - Notification body
     * @param {Record<string, import("../../types/index").NotificationDataValue | string>} params.data - Additional data payload
     * @returns {Promise<{ sent: number, failed: number, failures: Array<{ userId: string, deviceId?: string | null, error: string | undefined }> }>} Result with sent count, failed count, and failures array
     */
    async sendToUsers({ userIds, title, body, data }) {
      if (!userIds || userIds.length === 0) {
        logger.warn("sendToUsers called with empty userIds array");
        return { sent: 0, failed: 0, failures: [] };
      }

      try {
        const app = await initializeFirebaseAdmin();
        const messaging = admin.messaging(app);

        // Prepare notification payload
        const notification = {
          title: title || "Safe Space Alert",
          body: body || "You have a new notification",
        };

        // Prepare data payload (FCM data must be strings)
        /** @type {Record<string, string>} */
        const dataPayload = {};
        if (data) {
          for (const [key, value] of Object.entries(data)) {
            dataPayload[key] =
              typeof value === "string" ? value : JSON.stringify(value);
          }
        }

        const failures = [];
        let successCount = 0;

        // Send to each user by fetching their active FCM tokens
        for (const userId of userIds) {
          try {
            // Fetch active sessions with FCM tokens for this user
            if (!prisma) {
              logger.warn(
                `Prisma not available, skipping FCM token fetch for user ${userId}`
              );
              successCount++;
              continue;
            }

            const sessions = await prisma.session.findMany({
              where: {
                userId,
                revokedAt: null,
                fcmToken: { not: null },
                expiresAt: { gt: new Date() }, // Token must not be expired
              },
              select: { id: true, fcmToken: true, deviceId: true },
            });

            if (sessions.length === 0) {
              logger.debug(
                `No active FCM tokens found for user: ${userId}`
              );
              failures.push({
                userId,
                error: "No active FCM tokens",
              });
              continue;
            }

            // Send to each device
            for (const session of sessions) {
              try {
                const response = await messaging.send({
                  token: session.fcmToken,
                  notification,
                  data: dataPayload,
                  android: {
                    priority: "high",
                    ttl: 3600, // 1 hour
                  },
                  apns: {
                    headers: {
                      "apns-priority": "10",
                    },
                  },
                });

                logger.debug(
                  `FCM message sent to user ${userId} on device ${session.deviceId}: ${response}`
                );
                successCount++;
              } catch (error) {
                logger.error(
                  `Failed to send FCM message to token ${session.fcmToken}: ${error.message}`
                );

                // Handle specific FCM errors
                if (
                  error.code === "messaging/invalid-registration-token" ||
                  error.code === "messaging/registration-token-not-registered"
                ) {
                  // Token is no longer valid, revoke the session
                  try {
                    await prisma.session.update({
                      where: { id: session.id },
                      data: { revokedAt: new Date() },
                    });
                    logger.info(
                      `Revoked session ${session.id} due to invalid FCM token for user ${userId}`
                    );
                  } catch (revokeError) {
                    logger.error(
                      `Failed to revoke session: ${revokeError.message}`
                    );
                  }
                }

                failures.push({
                  userId,
                  deviceId: session.deviceId,
                  error: error.message,
                });
              }
            }
          } catch (error) {
            logger.error(
              `Failed to process user ${userId}: ${error.message}`
            );
            failures.push({
              userId,
              error: error.message,
            });
          }
        }

        const result = {
          sent: successCount,
          failed: failures.length,
          failures,
        };

        logger.info(
          `FCM send completed: ${successCount} sent, ${failures.length} failed`
        );
        return result;
      } catch (error) {
        logger.error(`FCM provider error: ${error.message}`);
        return {
          sent: 0,
          failed: userIds.length,
          failures: userIds.map((userId) => ({
            userId,
            error: error.message,
          })),
        };
      }
    },
  };
}


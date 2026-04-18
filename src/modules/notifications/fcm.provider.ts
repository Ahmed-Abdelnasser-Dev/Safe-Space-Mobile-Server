import admin from "firebase-admin";
import pino from "pino";
import fs from "node:fs";
import path from "node:path";
import type { NotificationDataValue } from "../../types/index.js";

const logger = pino();

type FcmSession = {
  id: string;
  fcmToken: string;
  deviceId: string | null;
};

type FcmPrismaLike = {
  session: {
    findMany: (input: {
      where: {
        userId: string;
        revokedAt: null;
        fcmToken: { not: null };
      };
      select: { id: true; fcmToken: true; deviceId: true };
    }) => Promise<FcmSession[]>;
    update: (input: { where: { id: string }; data: { revokedAt: Date } }) => Promise<unknown>;
  };
};

type SendToUsersInput = {
  userIds: string[];
  title: string;
  body: string;
  data: Record<string, NotificationDataValue | string>;
};

type SendFailure = {
  userId: string;
  deviceId?: string | null;
  error: string | undefined;
};

type SendToUsersResult = {
  sent: number;
  failed: number;
  failures: SendFailure[];
};

export type FcmProvider = {
  sendToUsers: (params: SendToUsersInput) => Promise<SendToUsersResult>;
};

function maskToken(token: string | null | undefined): string {
  if (!token) return "<none>";
  if (token.length <= 8) return "***";
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error";
}

function getErrorCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

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
      `Failed to initialize Firebase Admin SDK: ${getErrorMessage(error)}`
    );
    throw error;
  }
}

export function createFcmProvider(prisma?: FcmPrismaLike): FcmProvider {
  return {
    async sendToUsers({ userIds, title, body, data }: SendToUsersInput): Promise<SendToUsersResult> {
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
        const dataPayload: Record<string, string> = {};
        if (data) {
          for (const [key, value] of Object.entries(data)) {
            dataPayload[key] =
              typeof value === "string" ? value : JSON.stringify(value);
          }
        }

        const failures: SendFailure[] = [];
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
                const errorMessage = getErrorMessage(error);
                logger.error(
                  `Failed to send FCM message to token ${maskToken(session.fcmToken)}: ${errorMessage}`
                );

                // Handle specific FCM errors
                const errorCode = getErrorCode(error);
                if (
                  errorCode === "messaging/invalid-registration-token" ||
                  errorCode === "messaging/registration-token-not-registered"
                ) {
                  // Token is no longer valid, revoke the session
                  try {
                    await prisma?.session.update({
                      where: { id: session.id },
                      data: { revokedAt: new Date() },
                    });
                    logger.info(
                      `Revoked session ${session.id} due to invalid FCM token for user ${userId}`
                    );
                  } catch (revokeError) {
                    logger.error(
                      `Failed to revoke session: ${getErrorMessage(revokeError)}`
                    );
                  }
                }

                failures.push({
                  userId,
                  deviceId: session.deviceId,
                  error: errorMessage,
                });
              }
            }
          } catch (error) {
            const errorMessage = getErrorMessage(error);
            logger.error(
              `Failed to process user ${userId}: ${errorMessage}`
            );
            failures.push({
              userId,
              error: errorMessage,
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
        const errorMessage = getErrorMessage(error);
        logger.error(`FCM provider error: ${errorMessage}`);
        return {
          sent: 0,
          failed: userIds.length,
          failures: userIds.map((userId) => ({
            userId,
            error: errorMessage,
          })),
        };
      }
    },
  };
}


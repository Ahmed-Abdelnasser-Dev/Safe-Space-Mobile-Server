import type { AccidentSource } from "@prisma/client";
import type { AccidentMediaInput } from "../../types/index.js";

type AccidentCreateInput = {
  reporterUserId: string | null;
  source: AccidentSource;
  occurredAt: Date;
  lat: number;
  lng: number;
  message: string | null;
  description: string | null;
  severity: string;
  status?: string;
  media?: AccidentMediaInput[];
};

type AccidentsPrismaLike = {
  accident: {
    create: (input: { data: unknown; select: { id: true } }) => Promise<{ id: string }>;
  };
  session: {
    findMany: (input: {
      where: unknown;
      distinct: ["userId"];
      select: { userId: true };
    }) => Promise<Array<{ userId: string }>>;
  };
};

type AccidentsRepo = {
  createAccident: (data: AccidentCreateInput) => Promise<{ id: string }>;
  getActiveUsersWithFcmTokens: (excludeUserId?: string | null) => Promise<string[]>;
};

export function createAccidentsRepo(prisma: AccidentsPrismaLike): AccidentsRepo {
  return {
    async createAccident(data: AccidentCreateInput) {
      return prisma.accident.create({
        data: {
          reporterUserId: data.reporterUserId,
          source: data.source,
          occurredAt: data.occurredAt,
          lat: data.lat,
          lng: data.lng,
          message: data.message,
          description: data.description,
          severity: data.severity,
          status: data.status || "RECEIVED",
          media: data.media?.length
            ? {
                create: data.media.map((m) => ({ type: m.type, url: m.url })),
              }
            : undefined,
        },
        select: { id: true },
      });
    },

    async getActiveUsersWithFcmTokens(excludeUserId = null) {
      /**
       * Get users with non-revoked sessions that still have FCM tokens.
       * Let FCM decide token validity instead of auth session expiry.
       * @param {string|null} excludeUserId - User ID to exclude (e.g., the accident reporter)
       */
      const sessions = await prisma.session.findMany({
        where: {
          fcmToken: { not: null },
          revokedAt: null,
          ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
        },
        distinct: ["userId"],
        select: { userId: true },
      });

      // Extract unique user IDs
      return sessions.map((session) => session.userId);
    },
  };
}


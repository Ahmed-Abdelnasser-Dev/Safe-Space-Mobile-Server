/**
 * @typedef {{
 *   reporterUserId: string | null,
 *   source: import("@prisma/client").AccidentSource,
 *   occurredAt: Date,
 *   lat: number,
 *   lng: number,
 *   message: string | null,
 *   description: string | null,
 *   severity: string,
 *   status?: string,
 *   media?: import("../../types/index").AccidentMediaInput[]
 * }} AccidentCreateInput
 */

/**
 * @typedef {{
 *   accident: {
 *     create: (input: { data: unknown, select: { id: true } }) => Promise<{ id: string }>
 *   },
 *   session: {
 *     findMany: (input: {
 *       where: unknown,
 *       distinct: ["userId"],
 *       select: { userId: true }
 *     }) => Promise<Array<{ userId: string }>>
 *   }
 * }} AccidentsPrismaLike
 */

/**
 * @param {AccidentsPrismaLike} prisma
 */
export function createAccidentsRepo(prisma) {
  return {
    /**
     * @param {AccidentCreateInput} data
     * @returns {Promise<{ id: string }>}
     */
    async createAccident(data) {
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

    /**
     * @param {string | null} [excludeUserId]
     * @returns {Promise<string[]>}
     */
    async getActiveUsersWithFcmTokens(excludeUserId = null) {
      /**
       * Get all users who have active sessions with valid FCM tokens
       * These are users who can receive push notifications about accidents
       * @param {string|null} excludeUserId - User ID to exclude (e.g., the accident reporter)
       */
      const sessions = await prisma.session.findMany({
        where: {
          fcmToken: { not: null },
          revokedAt: null,
          expiresAt: { gt: new Date() },
          ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
        },
        distinct: ["userId"],
        select: { userId: true },
      });

      // Extract unique user IDs
      return sessions.map((s) => s.userId);
    },
  };
}


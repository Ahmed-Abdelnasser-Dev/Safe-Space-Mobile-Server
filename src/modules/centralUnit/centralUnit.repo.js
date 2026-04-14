import { AccidentSource } from "@prisma/client";

/**
 * @typedef {{
 *   accident: {
 *     findUnique: (input: {
 *       where: { id: string },
 *       include: { media: true }
 *     }) => Promise<{
 *       id: string,
 *       media: import("../../types/index").AccidentMediaInput[]
 *     } | null>,
 *     update: (input: {
 *       where: { id: string },
 *       data: { centralUnitReferenceId: string, status: string },
 *       select: { id: true, centralUnitReferenceId: true }
 *     }) => Promise<{ id: string, centralUnitReferenceId: string | null }>,
 *     create: (input: {
 *       data: {
 *         source: import("@prisma/client").AccidentSource,
 *         centralUnitAccidentId: string,
 *         occurredAt: Date,
 *         lat: number,
 *         lng: number,
 *         status: string
 *       },
 *       select: { id: true }
 *     }) => Promise<{ id: string }>
 *   },
 *   session: {
 *     findMany: (input: {
 *       where: unknown,
 *       distinct: ["userId"],
 *       select: { userId: true }
 *     }) => Promise<Array<{ userId: string }>>
 *   }
 * }} CentralUnitPrismaLike
 */

/**
 * @param {CentralUnitPrismaLike} prisma
 */
export function createCentralUnitRepo(prisma) {
  return {
    /**
     * @param {string} accidentId
     * @returns {Promise<{ id: string, media: import("../../types/index").AccidentMediaInput[] } | null>}
     */
    async findAccidentById(accidentId) {
      return prisma.accident.findUnique({
        where: { id: accidentId },
        include: { media: true },
      });
    },

    /**
     * @param {string} accidentId
     * @param {string} centralUnitReferenceId
     * @returns {Promise<{ id: string, centralUnitReferenceId: string | null }>}
     */
    async markAccidentSentToCentralUnit(accidentId, centralUnitReferenceId) {
      return prisma.accident.update({
        where: { id: accidentId },
        data: {
          centralUnitReferenceId,
          status: "SENT_TO_CENTRAL_UNIT",
        },
        select: { id: true, centralUnitReferenceId: true },
      });
    },

    /**
     * @param {{ centralUnitAccidentId: string, occurredAt: Date, lat: number, lng: number }} input
     * @returns {Promise<{ id: string }>}
     */
    async createInboundCentralUnitAccident({ centralUnitAccidentId, occurredAt, lat, lng }) {
      return prisma.accident.create({
        data: {
          source: AccidentSource.CENTRAL_UNIT,
          centralUnitAccidentId,
          occurredAt,
          lat,
          lng,
          status: "RECEIVED_FROM_CENTRAL_UNIT",
        },
        select: { id: true },
      });
    },

    /**
     * @returns {Promise<string[]>}
     */
    async getActiveUsersWithFcmTokens() {
      /**
       * Get all users who have active sessions with valid FCM tokens
       * These are users who can receive push notifications
       */
      const sessions = await prisma.session.findMany({
        where: {
          fcmToken: { not: null },
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        distinct: ["userId"],
        select: { userId: true },
      });

      // Extract unique user IDs
      return sessions.map((s) => s.userId);
    },
  };
}


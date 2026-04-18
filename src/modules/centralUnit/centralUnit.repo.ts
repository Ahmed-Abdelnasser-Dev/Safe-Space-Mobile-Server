import { AccidentSource } from "@prisma/client";
import type { AccidentMediaInput } from "../../types/index.js";

type CentralUnitPrismaLike = {
  accident: {
    findUnique: (input: {
      where: { id: string };
      include: { media: true };
    }) => Promise<{
      id: string;
      media: AccidentMediaInput[];
    } | null>;
    update: (input: {
      where: { id: string };
      data: { centralUnitReferenceId: string; status: string };
      select: { id: true; centralUnitReferenceId: true };
    }) => Promise<{ id: string; centralUnitReferenceId: string | null }>;
    create: (input: {
      data: {
        source: AccidentSource;
        centralUnitAccidentId: string;
        occurredAt: Date;
        lat: number;
        lng: number;
        status: string;
      };
      select: { id: true };
    }) => Promise<{ id: string }>;
  };
  session: {
    findMany: (input: {
      where: unknown;
      distinct: ["userId"];
      select: { userId: true };
    }) => Promise<Array<{ userId: string }>>;
  };
};

type InboundAccidentInput = {
  centralUnitAccidentId: string;
  occurredAt: Date;
  lat: number;
  lng: number;
};

type CentralUnitRepo = {
  findAccidentById: (
    accidentId: string,
  ) => Promise<{ id: string; media: AccidentMediaInput[] } | null>;
  markAccidentSentToCentralUnit: (
    accidentId: string,
    centralUnitReferenceId: string,
  ) => Promise<{ id: string; centralUnitReferenceId: string | null }>;
  createInboundCentralUnitAccident: (input: InboundAccidentInput) => Promise<{ id: string }>;
  getActiveUsersWithFcmTokens: () => Promise<string[]>;
};

export function createCentralUnitRepo(
  prisma: CentralUnitPrismaLike,
): CentralUnitRepo {
  return {
    async findAccidentById(accidentId: string) {
      return prisma.accident.findUnique({
        where: { id: accidentId },
        include: { media: true },
      });
    },

    async markAccidentSentToCentralUnit(
      accidentId: string,
      centralUnitReferenceId: string,
    ) {
      return prisma.accident.update({
        where: { id: accidentId },
        data: {
          centralUnitReferenceId,
          status: "SENT_TO_CENTRAL_UNIT",
        },
        select: { id: true, centralUnitReferenceId: true },
      });
    },

    async createInboundCentralUnitAccident({
      centralUnitAccidentId,
      occurredAt,
      lat,
      lng,
    }: InboundAccidentInput) {
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

    async getActiveUsersWithFcmTokens() {
      /**
       * Get all users with non-revoked sessions that still carry FCM tokens.
       * Delivery validity is decided by FCM responses, not auth expiry.
       */
      const sessions = await prisma.session.findMany({
        where: {
          fcmToken: { not: null },
          revokedAt: null,
        },
        distinct: ["userId"],
        select: { userId: true },
      });

      // Extract unique user IDs
      return sessions.map((s) => s.userId);
    },
  };
}


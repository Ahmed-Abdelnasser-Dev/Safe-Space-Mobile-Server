import { PrismaClient } from "@prisma/client";

/** @type {PrismaClient | undefined} */
let prisma;

/** @returns {PrismaClient} */
export function getPrisma() {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
  }
  return prisma;
}


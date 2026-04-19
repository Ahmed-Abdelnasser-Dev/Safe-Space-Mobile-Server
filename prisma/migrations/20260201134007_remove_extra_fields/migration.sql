/*
  Warnings:

  - You are about to drop the column `alcoholConsumption` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `identificationVerifiedAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `medicalInfoUpdatedAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `street` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `username` on the `User` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "User_username_idx";

-- DropIndex
DROP INDEX "User_username_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "alcoholConsumption",
DROP COLUMN "identificationVerifiedAt",
DROP COLUMN "medicalInfoUpdatedAt",
DROP COLUMN "street",
DROP COLUMN "username",
ADD COLUMN     "lastUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

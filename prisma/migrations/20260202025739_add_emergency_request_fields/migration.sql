/*
  Warnings:

  - You are about to drop the column `message` on the `EmergencyRequest` table. All the data in the column will be lost.
  - You are about to drop the column `requestTypes` on the `EmergencyRequest` table. All the data in the column will be lost.
  - You are about to drop the column `requestedAt` on the `EmergencyRequest` table. All the data in the column will be lost.
  - Added the required column `description` to the `EmergencyRequest` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EmergencyType" AS ENUM ('CAR_ACCIDENT', 'MEDICAL_EMERGENCY', 'FIRE', 'CRIME_VIOLENCE', 'VEHICLE_BREAKDOWN', 'OTHER');

-- CreateEnum
CREATE TYPE "EmergencyService" AS ENUM ('POLICE', 'AMBULANCE', 'FIRE_DEPARTMENT', 'ROADSIDE_ASSISTANCE');

-- AlterTable
ALTER TABLE "EmergencyRequest" DROP COLUMN "message",
DROP COLUMN "requestTypes",
DROP COLUMN "requestedAt",
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "emergencyServices" "EmergencyService"[],
ADD COLUMN     "emergencyTypes" "EmergencyType"[],
ADD COLUMN     "photoUri" TEXT,
ADD COLUMN     "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "EmergencyRequest_timestamp_idx" ON "EmergencyRequest"("timestamp");

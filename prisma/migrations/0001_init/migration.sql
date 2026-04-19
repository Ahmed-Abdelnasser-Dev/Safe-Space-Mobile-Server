-- Initial schema for SafeSpace Mobile Server
-- Generated manually because Prisma schema engine download may be blocked in offline environments.

-- Enums
DO $$ BEGIN
  CREATE TYPE "AccidentSource" AS ENUM ('MOBILE', 'CENTRAL_UNIT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "EmergencyRequestStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tables
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "email" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT,
  "fullName" TEXT NOT NULL,
  "phone" TEXT,
  "role" TEXT NOT NULL DEFAULT 'USER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Session" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "deviceId" TEXT,
  "fcmToken" TEXT,
  "refreshTokenHash" TEXT NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Accident" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "reporterUserId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "source" "AccidentSource" NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "lat" DOUBLE PRECISION NOT NULL,
  "lng" DOUBLE PRECISION NOT NULL,
  "message" TEXT,
  "description" TEXT,
  "severity" TEXT,
  "centralUnitAccidentId" TEXT,
  "centralUnitReferenceId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'RECEIVED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "AccidentMedia" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "accidentId" TEXT NOT NULL REFERENCES "Accident"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "EmergencyRequest" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "requesterUserId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "requestedAt" TIMESTAMP(3) NOT NULL,
  "lat" DOUBLE PRECISION NOT NULL,
  "lng" DOUBLE PRECISION NOT NULL,
  "message" TEXT,
  "requestTypes" TEXT[] NOT NULL,
  "status" "EmergencyRequestStatus" NOT NULL DEFAULT 'QUEUED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "NotificationLog" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "accidentId" TEXT,
  "userId" TEXT,
  "provider" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");

CREATE INDEX IF NOT EXISTS "Accident_reporterUserId_idx" ON "Accident"("reporterUserId");
CREATE INDEX IF NOT EXISTS "Accident_createdAt_idx" ON "Accident"("createdAt");
CREATE INDEX IF NOT EXISTS "Accident_centralUnitAccidentId_idx" ON "Accident"("centralUnitAccidentId");

CREATE INDEX IF NOT EXISTS "AccidentMedia_accidentId_idx" ON "AccidentMedia"("accidentId");

CREATE INDEX IF NOT EXISTS "EmergencyRequest_requesterUserId_idx" ON "EmergencyRequest"("requesterUserId");
CREATE INDEX IF NOT EXISTS "EmergencyRequest_createdAt_idx" ON "EmergencyRequest"("createdAt");

CREATE INDEX IF NOT EXISTS "NotificationLog_accidentId_idx" ON "NotificationLog"("accidentId");
CREATE INDEX IF NOT EXISTS "NotificationLog_userId_idx" ON "NotificationLog"("userId");
CREATE INDEX IF NOT EXISTS "NotificationLog_createdAt_idx" ON "NotificationLog"("createdAt");


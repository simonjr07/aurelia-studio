-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "Weekday" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "RateLimitAction" AS ENUM ('LOGIN', 'BOOKING_CREATE', 'PUBLIC_BOOKING_LOOKUP');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STAFF',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "description" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffService" (
    "id" UUID NOT NULL,
    "staffId" UUID NOT NULL,
    "serviceId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityRule" (
    "id" UUID NOT NULL,
    "staffId" UUID NOT NULL,
    "weekday" "Weekday" NOT NULL,
    "startLocalMinutes" INTEGER NOT NULL,
    "endLocalMinutes" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AvailabilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockedTime" (
    "id" UUID NOT NULL,
    "staffId" UUID NOT NULL,
    "startAt" TIMESTAMPTZ(3) NOT NULL,
    "endAt" TIMESTAMPTZ(3) NOT NULL,
    "reason" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockedTime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" UUID NOT NULL,
    "publicReference" VARCHAR(32) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "serviceId" UUID NOT NULL,
    "staffId" UUID NOT NULL,
    "customerName" VARCHAR(120) NOT NULL,
    "customerEmail" VARCHAR(320) NOT NULL,
    "customerPhone" VARCHAR(40) NOT NULL,
    "startAt" TIMESTAMPTZ(3) NOT NULL,
    "endAt" TIMESTAMPTZ(3) NOT NULL,
    "timezoneSnapshot" VARCHAR(100) NOT NULL,
    "serviceNameSnapshot" VARCHAR(120) NOT NULL,
    "serviceDurationSnapshot" INTEGER NOT NULL,
    "priceCentsSnapshot" INTEGER NOT NULL,
    "currencySnapshot" VARCHAR(3) NOT NULL,
    "customerNote" VARCHAR(2000),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingStatusEvent" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "fromStatus" "BookingStatus",
    "toStatus" "BookingStatus" NOT NULL,
    "changedByUserId" UUID,
    "note" VARCHAR(1000),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessSettings" (
    "id" VARCHAR(32) NOT NULL DEFAULT 'default',
    "businessName" VARCHAR(120) NOT NULL,
    "timezone" VARCHAR(100) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "bookingLeadMinutes" INTEGER NOT NULL,
    "bookingHorizonDays" INTEGER NOT NULL,
    "slotIntervalMinutes" INTEGER NOT NULL,
    "cancellationCutoffMinutes" INTEGER NOT NULL,
    "rescheduleCutoffMinutes" INTEGER NOT NULL,
    "publicEmail" VARCHAR(320),
    "publicPhone" VARCHAR(40),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BusinessSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "id" UUID NOT NULL,
    "action" "RateLimitAction" NOT NULL,
    "keyHash" VARCHAR(128) NOT NULL,
    "windowStart" TIMESTAMPTZ(3) NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_status_role_idx" ON "User"("status", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Service_slug_key" ON "Service"("slug");

-- CreateIndex
CREATE INDEX "Service_isPublished_isActive_idx" ON "Service"("isPublished", "isActive");

-- CreateIndex
CREATE INDEX "StaffService_serviceId_staffId_idx" ON "StaffService"("serviceId", "staffId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffService_staffId_serviceId_key" ON "StaffService"("staffId", "serviceId");

-- CreateIndex
CREATE INDEX "AvailabilityRule_staffId_weekday_isActive_idx" ON "AvailabilityRule"("staffId", "weekday", "isActive");

-- CreateIndex
CREATE INDEX "BlockedTime_staffId_startAt_endAt_idx" ON "BlockedTime"("staffId", "startAt", "endAt");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_publicReference_key" ON "Booking"("publicReference");

-- CreateIndex
CREATE INDEX "Booking_staffId_startAt_endAt_idx" ON "Booking"("staffId", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "Booking_serviceId_startAt_idx" ON "Booking"("serviceId", "startAt");

-- CreateIndex
CREATE INDEX "Booking_status_startAt_idx" ON "Booking"("status", "startAt");

-- CreateIndex
CREATE INDEX "BookingStatusEvent_bookingId_createdAt_idx" ON "BookingStatusEvent"("bookingId", "createdAt");

-- CreateIndex
CREATE INDEX "BookingStatusEvent_changedByUserId_idx" ON "BookingStatusEvent"("changedByUserId");

-- CreateIndex
CREATE INDEX "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimitBucket_action_keyHash_windowStart_key" ON "RateLimitBucket"("action", "keyHash", "windowStart");

-- AddForeignKey
ALTER TABLE "StaffService" ADD CONSTRAINT "StaffService_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffService" ADD CONSTRAINT "StaffService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRule" ADD CONSTRAINT "AvailabilityRule_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockedTime" ADD CONSTRAINT "BlockedTime_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingStatusEvent" ADD CONSTRAINT "BookingStatusEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingStatusEvent" ADD CONSTRAINT "BookingStatusEvent_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Domain checks that Prisma's schema language cannot currently express.
ALTER TABLE "Service"
    ADD CONSTRAINT "Service_durationMinutes_positive" CHECK ("durationMinutes" > 0),
    ADD CONSTRAINT "Service_priceCents_nonnegative" CHECK ("priceCents" >= 0);

-- Recurring availability uses local minutes after midnight: 0 is 00:00 and
-- 1440 is the exclusive end of day. This deliberately is not a UTC timestamp.
ALTER TABLE "AvailabilityRule"
    ADD CONSTRAINT "AvailabilityRule_local_minutes_valid" CHECK (
        "startLocalMinutes" >= 0
        AND "startLocalMinutes" < 1440
        AND "endLocalMinutes" > 0
        AND "endLocalMinutes" <= 1440
        AND "startLocalMinutes" < "endLocalMinutes"
    );

ALTER TABLE "BlockedTime"
    ADD CONSTRAINT "BlockedTime_interval_valid" CHECK ("startAt" < "endAt");

ALTER TABLE "Booking"
    ADD CONSTRAINT "Booking_interval_valid" CHECK ("startAt" < "endAt"),
    ADD CONSTRAINT "Booking_durationSnapshot_positive" CHECK ("serviceDurationSnapshot" > 0),
    ADD CONSTRAINT "Booking_priceSnapshot_nonnegative" CHECK ("priceCentsSnapshot" >= 0);

ALTER TABLE "BusinessSettings"
    ADD CONSTRAINT "BusinessSettings_booking_rules_valid" CHECK (
        "bookingLeadMinutes" >= 0
        AND "bookingHorizonDays" > 0
        AND "slotIntervalMinutes" > 0
        AND "cancellationCutoffMinutes" >= 0
        AND "rescheduleCutoffMinutes" >= 0
    );

ALTER TABLE "RateLimitBucket"
    ADD CONSTRAINT "RateLimitBucket_values_valid" CHECK (
        "requestCount" >= 0 AND "windowStart" < "expiresAt"
    );

-- Authoritative booking-capacity invariant. PostgreSQL's GiST exclusion
-- constraint is concurrency-safe and uses half-open [startAt, endAt) ranges,
-- so adjacent appointments are permitted. Only PENDING and CONFIRMED rows
-- occupy capacity; other lifecycle states do not participate in the index.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Booking"
    ADD CONSTRAINT "Booking_staff_active_time_no_overlap"
    EXCLUDE USING gist (
        "staffId" WITH =,
        tstzrange("startAt", "endAt", '[)') WITH &&
    )
    WHERE ("status" IN ('PENDING'::"BookingStatus", 'CONFIRMED'::"BookingStatus"));

-- Required single-business baseline. The companion bootstrap command also
-- uses an idempotent upsert, so rerunning bootstrap never overwrites settings.
INSERT INTO "BusinessSettings" (
    "id",
    "businessName",
    "timezone",
    "currency",
    "bookingLeadMinutes",
    "bookingHorizonDays",
    "slotIntervalMinutes",
    "cancellationCutoffMinutes",
    "rescheduleCutoffMinutes",
    "createdAt",
    "updatedAt"
)
VALUES (
    'default',
    'Aurelia Studio',
    'America/New_York',
    'USD',
    60,
    60,
    15,
    120,
    240,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

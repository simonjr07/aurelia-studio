ALTER TYPE "RateLimitAction" ADD VALUE 'PUBLIC_BOOKING_CANCEL';
ALTER TYPE "RateLimitAction" ADD VALUE 'PUBLIC_BOOKING_RESCHEDULE';

CREATE TABLE "BookingRescheduleEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bookingId" UUID NOT NULL,
    "fromStaffId" UUID NOT NULL,
    "toStaffId" UUID NOT NULL,
    "fromStartAt" TIMESTAMPTZ(3) NOT NULL,
    "fromEndAt" TIMESTAMPTZ(3) NOT NULL,
    "toStartAt" TIMESTAMPTZ(3) NOT NULL,
    "toEndAt" TIMESTAMPTZ(3) NOT NULL,
    "changedByUserId" UUID,
    "note" VARCHAR(1000),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BookingRescheduleEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BookingRescheduleEvent_bookingId_createdAt_idx" ON "BookingRescheduleEvent"("bookingId", "createdAt");
CREATE INDEX "BookingRescheduleEvent_changedByUserId_idx" ON "BookingRescheduleEvent"("changedByUserId");
ALTER TABLE "BookingRescheduleEvent" ADD CONSTRAINT "BookingRescheduleEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookingRescheduleEvent" ADD CONSTRAINT "BookingRescheduleEvent_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

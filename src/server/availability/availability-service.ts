import "server-only";

import { DateTime } from "luxon";

import type { Prisma, PrismaClient } from "../../generated/prisma/client";
import { Weekday } from "../../generated/prisma/enums";
import { getPrismaClient } from "../db/prisma";

import {
  BLOCKING_BOOKING_STATUSES,
  generateAvailabilitySlots,
  type InstantInterval,
} from "./availability-engine";
import { isValidLocalDate } from "./request-validation";

const weekdayByLuxonWeekday = [
  Weekday.MONDAY,
  Weekday.TUESDAY,
  Weekday.WEDNESDAY,
  Weekday.THURSDAY,
  Weekday.FRIDAY,
  Weekday.SATURDAY,
  Weekday.SUNDAY,
] as const;

export class PublicServiceNotFoundError extends Error {
  constructor() {
    super("Public service was not found.");
    this.name = "PublicServiceNotFoundError";
  }
}

export class AvailabilityStaffNotEligibleError extends Error {
  constructor() {
    super("The requested staff member is not eligible for this service.");
    this.name = "AvailabilityStaffNotEligibleError";
  }
}

export class AvailabilityConfigurationError extends Error {
  constructor() {
    super("Availability configuration is unavailable.");
    this.name = "AvailabilityConfigurationError";
  }
}

export class InvalidAvailabilityDateError extends Error {
  constructor() {
    super("The requested availability date is invalid.");
    this.name = "InvalidAvailabilityDateError";
  }
}

export type GetServiceAvailabilityInput = {
  serviceSlug: string;
  date: string;
  staffId?: string;
  now?: Date;
  excludeBookingId?: string;
  durationMinutesOverride?: number;
};

export type ServiceAvailability = {
  date: string;
  timezone: string;
  service: {
    id: string;
    slug: string;
    name: string;
    durationMinutes: number;
  };
  slots: Array<{
    startAt: string;
    endAt: string;
    localTimeLabel: string;
    eligibleStaff: Array<{ id: string; name: string }>;
  }>;
};

function toInterval(startAt: Date, endAt: Date): InstantInterval {
  return { startAt, endAt };
}

type AvailabilityDatabase = PrismaClient | Prisma.TransactionClient;

export async function getServiceAvailabilityWithDatabase(
  prisma: AvailabilityDatabase,
  {
  serviceSlug,
  date,
  staffId,
  now = new Date(),
  excludeBookingId,
  durationMinutesOverride,
  }: GetServiceAvailabilityInput,
): Promise<ServiceAvailability> {
  const [settings, service] = await Promise.all([
    prisma.businessSettings.findUnique({
      where: { id: "default" },
      select: { timezone: true, bookingLeadMinutes: true, bookingHorizonDays: true, slotIntervalMinutes: true },
    }),
    prisma.service.findFirst({
      where: { slug: serviceSlug, isPublished: true, isActive: true },
      select: {
        id: true,
        slug: true,
        name: true,
        durationMinutes: true,
        staffServices: {
          where: { staff: { status: "ACTIVE" } },
          orderBy: [{ staff: { name: "asc" } }, { staffId: "asc" }],
          select: { staff: { select: { id: true, name: true } } },
        },
      },
    }),
  ]);

  if (!service) {
    throw new PublicServiceNotFoundError();
  }

  if (!settings) {
    throw new AvailabilityConfigurationError();
  }

  if (!isValidLocalDate(date, settings.timezone)) {
    throw new InvalidAvailabilityDateError();
  }

  const allEligibleStaff = service.staffServices.map(({ staff }) => staff);
  const durationMinutes = durationMinutesOverride ?? service.durationMinutes;
  const eligibleStaff = staffId
    ? allEligibleStaff.filter((staff) => staff.id === staffId)
    : allEligibleStaff;

  if (staffId && eligibleStaff.length === 0) {
    throw new AvailabilityStaffNotEligibleError();
  }

  const requestedDate = DateTime.fromISO(date, { zone: settings.timezone });
  const dayStart = requestedDate.startOf("day");
  const dayEnd = dayStart.plus({ days: 1 });
  const staffIds = eligibleStaff.map(({ id }) => id);

  if (staffIds.length === 0) {
    return {
      date,
      timezone: settings.timezone,
      service: {
        id: service.id,
        slug: service.slug,
        name: service.name,
        durationMinutes,
      },
      slots: [],
    };
  }

  const weekday = weekdayByLuxonWeekday[requestedDate.weekday - 1];
  const [rules, blockedTimes, bookings] = await Promise.all([
    prisma.availabilityRule.findMany({
      where: { staffId: { in: staffIds }, weekday, isActive: true },
      select: { staffId: true, startLocalMinutes: true, endLocalMinutes: true },
      orderBy: [{ staffId: "asc" }, { startLocalMinutes: "asc" }],
    }),
    prisma.blockedTime.findMany({
      where: {
        staffId: { in: staffIds },
        startAt: { lt: dayEnd.toJSDate() },
        endAt: { gt: dayStart.toJSDate() },
      },
      select: { staffId: true, startAt: true, endAt: true },
    }),
    prisma.booking.findMany({
      where: {
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
        staffId: { in: staffIds },
        status: { in: [...BLOCKING_BOOKING_STATUSES] },
        startAt: { lt: dayEnd.toJSDate() },
        endAt: { gt: dayStart.toJSDate() },
      },
      select: { staffId: true, startAt: true, endAt: true },
    }),
  ]);

  const slotsByStart = new Map<
    number,
    {
      startAt: Date;
      endAt: Date;
      localTimeLabel: string;
      eligibleStaff: Array<{ id: string; name: string }>;
    }
  >();

  for (const staff of eligibleStaff) {
    const staffRules = rules.filter((rule) => rule.staffId === staff.id);
    const staffBlockedTimes = blockedTimes
      .filter((interval) => interval.staffId === staff.id)
      .map((interval) => toInterval(interval.startAt, interval.endAt));
    const staffBookings = bookings
      .filter((booking) => booking.staffId === staff.id)
      .map((interval) => toInterval(interval.startAt, interval.endAt));
    const staffSlots = generateAvailabilitySlots({
      date,
      timezone: settings.timezone,
      windows: staffRules,
      durationMinutes,
      slotIntervalMinutes: settings.slotIntervalMinutes,
      now,
      bookingLeadMinutes: settings.bookingLeadMinutes,
      bookingHorizonDays: settings.bookingHorizonDays,
      blockedIntervals: staffBlockedTimes,
      bookedIntervals: staffBookings,
    });

    for (const slot of staffSlots) {
      const key = slot.startAt.getTime();
      const existing = slotsByStart.get(key);

      if (existing) {
        existing.eligibleStaff.push(staff);
      } else {
        slotsByStart.set(key, {
          ...slot,
          eligibleStaff: [staff],
        });
      }
    }
  }

  return {
    date,
    timezone: settings.timezone,
    service: {
      id: service.id,
      slug: service.slug,
      name: service.name,
      durationMinutes,
    },
    slots: [...slotsByStart.values()]
      .sort((left, right) => left.startAt.getTime() - right.startAt.getTime())
      .map((slot) => ({
        startAt: slot.startAt.toISOString(),
        endAt: slot.endAt.toISOString(),
        localTimeLabel: slot.localTimeLabel,
        eligibleStaff: slot.eligibleStaff,
      })),
  };
}

export function getServiceAvailability(
  input: GetServiceAvailabilityInput,
): Promise<ServiceAvailability> {
  return getServiceAvailabilityWithDatabase(getPrismaClient(), input);
}

import { DateTime } from "luxon";

export const BLOCKING_BOOKING_STATUSES = ["PENDING", "CONFIRMED"] as const;

export function isCapacityBlockingBookingStatus(status: string) {
  return (BLOCKING_BOOKING_STATUSES as readonly string[]).includes(status);
}

export type InstantInterval = {
  startAt: Date;
  endAt: Date;
};

export type LocalAvailabilityWindow = {
  startLocalMinutes: number;
  endLocalMinutes: number;
};

export type AvailabilitySlot = {
  startAt: Date;
  endAt: Date;
  localTimeLabel: string;
};

export type GenerateAvailabilitySlotsInput = {
  date: string;
  timezone: string;
  windows: LocalAvailabilityWindow[];
  durationMinutes: number;
  slotIntervalMinutes: number;
  now: Date;
  bookingLeadMinutes: number;
  bookingHorizonDays: number;
  blockedIntervals?: InstantInterval[];
  bookedIntervals?: InstantInterval[];
};

function sameLocalFields(
  dateTime: DateTime,
  fields: { year: number; month: number; day: number; hour: number; minute: number },
) {
  return (
    dateTime.year === fields.year &&
    dateTime.month === fields.month &&
    dateTime.day === fields.day &&
    dateTime.hour === fields.hour &&
    dateTime.minute === fields.minute &&
    dateTime.second === 0 &&
    dateTime.millisecond === 0
  );
}

/**
 * Resolves one wall clock value in an IANA zone. Nonexistent DST values are
 * rejected. When a value occurs twice during fall back, the earlier instant
 * is selected so each local grid position has one deterministic meaning.
 */
export function resolveLocalWallTime(
  date: string,
  localMinutes: number,
  timezone: string,
) {
  const dateTime = DateTime.fromISO(date, { zone: timezone });

  if (!dateTime.isValid || !Number.isInteger(localMinutes)) {
    return null;
  }

  const fields = {
    year: dateTime.year,
    month: dateTime.month,
    day: dateTime.day,
    hour: Math.floor(localMinutes / 60),
    minute: localMinutes % 60,
  };

  if (fields.hour > 23 || fields.minute > 59) {
    return null;
  }

  const candidate = DateTime.fromObject(fields, { zone: timezone });

  if (!candidate.isValid) {
    return null;
  }

  const possibleOffsets = candidate.getPossibleOffsets();
  const exactCandidates = possibleOffsets
    .filter((possible) => sameLocalFields(possible, fields))
    .sort((left, right) => left.toMillis() - right.toMillis());

  return exactCandidates[0] ?? null;
}

function mergeLocalWindows(windows: LocalAvailabilityWindow[]) {
  const normalized = windows
    .filter(
      (window) =>
        Number.isInteger(window.startLocalMinutes) &&
        Number.isInteger(window.endLocalMinutes) &&
        window.startLocalMinutes >= 0 &&
        window.endLocalMinutes <= 1440 &&
        window.startLocalMinutes < window.endLocalMinutes,
    )
    .map((window) => ({ ...window }))
    .sort(
      (left, right) =>
        left.startLocalMinutes - right.startLocalMinutes ||
        left.endLocalMinutes - right.endLocalMinutes,
    );

  return normalized.reduce<LocalAvailabilityWindow[]>((merged, window) => {
    const previous = merged.at(-1);

    if (!previous || window.startLocalMinutes > previous.endLocalMinutes) {
      merged.push(window);
    } else {
      previous.endLocalMinutes = Math.max(
        previous.endLocalMinutes,
        window.endLocalMinutes,
      );
    }

    return merged;
  }, []);
}

function overlaps(left: InstantInterval, startAt: Date, endAt: Date) {
  return left.startAt < endAt && left.endAt > startAt;
}

function isWithinDateHorizon(
  requestedDate: DateTime,
  now: DateTime,
  bookingHorizonDays: number,
) {
  const today = now.startOf("day");
  const lastBookableDate = today.plus({ days: bookingHorizonDays });

  return requestedDate >= today && requestedDate <= lastBookableDate;
}

export function generateAvailabilitySlots({
  date,
  timezone,
  windows,
  durationMinutes,
  slotIntervalMinutes,
  now,
  bookingLeadMinutes,
  bookingHorizonDays,
  blockedIntervals = [],
  bookedIntervals = [],
}: GenerateAvailabilitySlotsInput): AvailabilitySlot[] {
  if (
    !Number.isInteger(durationMinutes) ||
    durationMinutes <= 0 ||
    !Number.isInteger(slotIntervalMinutes) ||
    slotIntervalMinutes <= 0 ||
    !Number.isInteger(bookingLeadMinutes) ||
    bookingLeadMinutes < 0 ||
    !Number.isInteger(bookingHorizonDays) ||
    bookingHorizonDays < 0 ||
    !DateTime.fromJSDate(now).isValid
  ) {
    return [];
  }

  const requestedDate = DateTime.fromISO(date, { zone: timezone });
  const zonedNow = DateTime.fromJSDate(now, { zone: timezone });

  if (
    !requestedDate.isValid ||
    requestedDate.toISODate() !== date ||
    !isWithinDateHorizon(requestedDate.startOf("day"), zonedNow, bookingHorizonDays)
  ) {
    return [];
  }

  const cutoff = now.getTime() + bookingLeadMinutes * 60_000;
  const mergedWindows = mergeLocalWindows(windows);
  const slots: AvailabilitySlot[] = [];
  const seenStartInstants = new Set<number>();

  for (const window of mergedWindows) {
    const firstStart =
      Math.ceil(window.startLocalMinutes / slotIntervalMinutes) *
      slotIntervalMinutes;
    const latestStart = window.endLocalMinutes - durationMinutes;

    for (
      let startLocalMinutes = firstStart;
      startLocalMinutes <= latestStart;
      startLocalMinutes += slotIntervalMinutes
    ) {
      const startLocal = resolveLocalWallTime(
        date,
        startLocalMinutes,
        timezone,
      );

      if (!startLocal) {
        continue;
      }

      const startAt = startLocal.toJSDate();
      const endAt = startLocal.plus({ minutes: durationMinutes }).toJSDate();
      const endLocal = DateTime.fromJSDate(endAt, { zone: timezone });

      if (
        !endLocal.isValid ||
        endLocal.toISODate() !== date ||
        startAt.getTime() < cutoff ||
        seenStartInstants.has(startAt.getTime())
      ) {
        continue;
      }

      const blocked = blockedIntervals.some((interval) =>
        overlaps(interval, startAt, endAt),
      );
      const booked = bookedIntervals.some((interval) =>
        overlaps(interval, startAt, endAt),
      );

      if (blocked || booked) {
        continue;
      }

      seenStartInstants.add(startAt.getTime());
      slots.push({
        startAt,
        endAt,
        localTimeLabel: startLocal.setLocale("en-US").toFormat("h:mm a"),
      });
    }
  }

  return slots.sort((left, right) => left.startAt.getTime() - right.startAt.getTime());
}

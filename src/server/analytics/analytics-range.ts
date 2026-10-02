import { DateTime } from "luxon";
import { z } from "zod";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const presetDays = { "7d": 7, "30d": 30, "90d": 90 } as const;

export type AnalyticsPreset = keyof typeof presetDays;
export type AnalyticsFilterInput = {
  range?: unknown;
  start?: unknown;
  end?: unknown;
};

export type AnalyticsRange = {
  preset: AnalyticsPreset | "custom";
  startDate: string;
  endDate: string;
  startAt: Date;
  endAtExclusive: Date;
  dayCount: number;
  timezone: string;
};

export class AnalyticsRangeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalyticsRangeError";
  }
}

const filterSchema = z
  .object({
    range: z.enum(["7d", "30d", "90d"]).optional(),
    start: z.string().regex(datePattern).optional(),
    end: z.string().regex(datePattern).optional(),
  })
  .strict();

function parseLocalDate(value: string, timezone: string) {
  const result = DateTime.fromISO(value, { zone: timezone }).startOf("day");
  if (!result.isValid || result.toISODate() !== value) {
    throw new AnalyticsRangeError("Enter valid start and end dates.");
  }
  return result;
}

export function resolveAnalyticsRange(
  candidate: AnalyticsFilterInput,
  timezone: string,
  now = new Date(),
): AnalyticsRange {
  const zoneCheck = DateTime.fromJSDate(now, { zone: timezone });
  if (!zoneCheck.isValid) {
    throw new AnalyticsRangeError("The studio timezone is not configured correctly.");
  }

  const parsed = filterSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new AnalyticsRangeError("Choose a valid analytics date range.");
  }

  const hasStart = parsed.data.start !== undefined;
  const hasEnd = parsed.data.end !== undefined;
  if (hasStart !== hasEnd) {
    throw new AnalyticsRangeError("Choose both a start date and an end date.");
  }

  let preset: AnalyticsRange["preset"];
  let start: DateTime;
  let end: DateTime;

  if (parsed.data.start && parsed.data.end) {
    preset = "custom";
    start = parseLocalDate(parsed.data.start, timezone);
    end = parseLocalDate(parsed.data.end, timezone);
  } else {
    preset = parsed.data.range ?? "30d";
    const days = presetDays[preset];
    end = zoneCheck.startOf("day");
    start = end.minus({ days: days - 1 });
  }

  if (start > end) {
    throw new AnalyticsRangeError("The start date must be on or before the end date.");
  }

  const dayCount = Math.round(end.diff(start, "days").days) + 1;
  if (dayCount > 365) {
    throw new AnalyticsRangeError("Analytics ranges cannot exceed 365 days.");
  }

  return {
    preset,
    startDate: start.toISODate()!,
    endDate: end.toISODate()!,
    startAt: start.toUTC().toJSDate(),
    endAtExclusive: end.plus({ days: 1 }).toUTC().toJSDate(),
    dayCount,
    timezone,
  };
}

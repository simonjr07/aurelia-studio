import { DateTime } from "luxon";
import { z } from "zod";

export const availabilityRequestSchema = z.object({
  service: z.string().trim().min(1).max(160),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format."),
  staff: z.string().uuid().optional(),
});

export function isValidLocalDate(date: string, timezone: string) {
  const parsed = DateTime.fromISO(date, { zone: timezone });
  return parsed.isValid && parsed.toISODate() === date;
}

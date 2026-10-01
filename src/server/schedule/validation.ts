import { z } from "zod";

import { Weekday } from "../../generated/prisma/enums";

const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const endTimePattern = /^(?:(?:[01]\d|2[0-3]):[0-5]\d|24:00)$/;

export function parseLocalTime(value: string, allowEndOfDay = false) {
  const pattern = allowEndOfDay ? endTimePattern : timePattern;
  if (!pattern.test(value)) return null;
  if (value === "24:00") return 1440;
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

export const createAvailabilityRuleSchema = z
  .object({
    staffId: z.string().uuid(),
    weekday: z.nativeEnum(Weekday),
    startTime: z.string(),
    endTime: z.string(),
  })
  .strict()
  .transform((input, context) => {
    const startLocalMinutes = parseLocalTime(input.startTime);
    const endLocalMinutes = parseLocalTime(input.endTime, true);
    if (startLocalMinutes === null) context.addIssue({ code: "custom", path: ["startTime"], message: "Enter a valid start time." });
    if (endLocalMinutes === null) context.addIssue({ code: "custom", path: ["endTime"], message: "Enter a valid end time." });
    if (startLocalMinutes !== null && endLocalMinutes !== null && endLocalMinutes - startLocalMinutes < 15) {
      context.addIssue({ code: "custom", path: ["endTime"], message: "Availability must be at least 15 minutes." });
    }
    return { staffId: input.staffId, weekday: input.weekday, startLocalMinutes: startLocalMinutes ?? 0, endLocalMinutes: endLocalMinutes ?? 0 };
  });

export const createBlockedTimeSchema = z.object({
  staffId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string(),
  endTime: z.string(),
  reason: z.string().trim().max(500).optional().default(""),
}).strict().transform((input, context) => {
  const startLocalMinutes = parseLocalTime(input.startTime);
  const endLocalMinutes = parseLocalTime(input.endTime, true);
  if (startLocalMinutes === null) context.addIssue({ code: "custom", path: ["startTime"], message: "Enter a valid start time." });
  if (endLocalMinutes === null) context.addIssue({ code: "custom", path: ["endTime"], message: "Enter a valid end time." });
  if (startLocalMinutes !== null && endLocalMinutes !== null && startLocalMinutes >= endLocalMinutes) {
    context.addIssue({ code: "custom", path: ["endTime"], message: "End time must be after start time." });
  }
  return { ...input, reason: input.reason || null, startLocalMinutes: startLocalMinutes ?? 0, endLocalMinutes: endLocalMinutes ?? 0 };
});


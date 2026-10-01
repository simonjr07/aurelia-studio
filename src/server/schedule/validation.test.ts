import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { resolveBlockedTime, ScheduleConflictError } from "./schedule-service";
import { createAvailabilityRuleSchema, createBlockedTimeSchema, parseLocalTime } from "./validation";

const staffId = "11111111-1111-4111-8111-111111111111";

describe("schedule validation", () => {
  it("converts wall-clock strings to minutes after midnight", () => {
    expect(parseLocalTime("09:30")).toBe(570);
    expect(parseLocalTime("24:00", true)).toBe(1440);
    expect(parseLocalTime("24:00")).toBeNull();
  });

  it.each([
    { startTime: "12:00", endTime: "12:00" },
    { startTime: "12:15", endTime: "12:00" },
    { startTime: "bad", endTime: "13:00" },
    { startTime: "12:00", endTime: "12:10" },
  ])("rejects invalid or non-positive recurring ranges", (times) => {
    expect(createAvailabilityRuleSchema.safeParse({ staffId, weekday: "MONDAY", ...times }).success).toBe(false);
  });

  it("rejects invalid blocked ranges", () => {
    expect(createBlockedTimeSchema.safeParse({ staffId, date: "2026-10-10", startTime: "15:00", endTime: "14:00", reason: "" }).success).toBe(false);
  });

  it("rejects nonexistent spring-forward local times", () => {
    expect(() => resolveBlockedTime("2026-03-08", 150, 210, "America/New_York")).toThrow(ScheduleConflictError);
  });

  it("chooses the earlier instant for ambiguous fall-back time", () => {
    const interval = resolveBlockedTime("2026-11-01", 90, 120, "America/New_York");
    expect(interval.startAt.toISOString()).toBe("2026-11-01T05:30:00.000Z");
    expect(interval.endAt.toISOString()).toBe("2026-11-01T07:00:00.000Z");
  });
});


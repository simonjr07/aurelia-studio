import { describe, expect, it } from "vitest";

import { AnalyticsRangeError, resolveAnalyticsRange } from "./analytics-range";

const timezone = "America/New_York";
const now = new Date("2026-10-02T16:00:00.000Z");

describe("analytics date ranges", () => {
  it("defaults to today plus the previous 29 studio-local days", () => {
    const range = resolveAnalyticsRange({}, timezone, now);
    expect(range).toMatchObject({ preset: "30d", startDate: "2026-09-03", endDate: "2026-10-02", dayCount: 30 });
    expect(range.startAt.toISOString()).toBe("2026-09-03T04:00:00.000Z");
    expect(range.endAtExclusive.toISOString()).toBe("2026-10-03T04:00:00.000Z");
  });

  it("accepts inclusive explicit local dates and makes the upper instant exclusive", () => {
    const range = resolveAnalyticsRange({ start: "2026-10-01", end: "2026-10-31" }, timezone, now);
    expect(range).toMatchObject({ preset: "custom", startDate: "2026-10-01", endDate: "2026-10-31", dayCount: 31 });
    expect(range.startAt.toISOString()).toBe("2026-10-01T04:00:00.000Z");
    expect(range.endAtExclusive.toISOString()).toBe("2026-11-01T04:00:00.000Z");
  });

  it("rejects reversed, incomplete, malformed, and impossible dates", () => {
    expect(() => resolveAnalyticsRange({ start: "2026-10-02", end: "2026-10-01" }, timezone, now)).toThrow(AnalyticsRangeError);
    expect(() => resolveAnalyticsRange({ start: "2026-10-01" }, timezone, now)).toThrow(AnalyticsRangeError);
    expect(() => resolveAnalyticsRange({ start: "10/01/2026", end: "2026-10-02" }, timezone, now)).toThrow(AnalyticsRangeError);
    expect(() => resolveAnalyticsRange({ start: "2026-02-30", end: "2026-03-01" }, timezone, now)).toThrow(AnalyticsRangeError);
  });

  it("allows 365 calendar days but rejects a larger query", () => {
    expect(resolveAnalyticsRange({ start: "2026-01-01", end: "2026-12-31" }, timezone, now).dayCount).toBe(365);
    expect(() => resolveAnalyticsRange({ start: "2026-01-01", end: "2027-01-01" }, timezone, now)).toThrow("cannot exceed 365 days");
  });

  it("uses 23- and 25-hour UTC spans for DST transition days", () => {
    const spring = resolveAnalyticsRange({ start: "2026-03-08", end: "2026-03-08" }, timezone, now);
    const fall = resolveAnalyticsRange({ start: "2026-11-01", end: "2026-11-01" }, timezone, now);
    expect(spring.endAtExclusive.getTime() - spring.startAt.getTime()).toBe(23 * 60 * 60_000);
    expect(fall.endAtExclusive.getTime() - fall.startAt.getTime()).toBe(25 * 60 * 60_000);
  });
});

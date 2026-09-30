import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";

import {
  isCapacityBlockingBookingStatus,
  generateAvailabilitySlots,
  resolveLocalWallTime,
} from "./availability-engine";

const timezone = "America/New_York";
const now = DateTime.fromISO("2026-10-01T08:00:00", { zone: timezone })
  .toUTC()
  .toJSDate();

function generate(
  overrides: Partial<Parameters<typeof generateAvailabilitySlots>[0]> = {},
) {
  return generateAvailabilitySlots({
    date: "2026-10-01",
    timezone,
    windows: [{ startLocalMinutes: 540, endLocalMinutes: 720 }],
    durationMinutes: 60,
    slotIntervalMinutes: 15,
    now,
    bookingLeadMinutes: 0,
    bookingHorizonDays: 30,
    ...overrides,
  });
}

describe("availability slot generation", () => {
  it("shares the database capacity-blocking status rule", () => {
    expect(isCapacityBlockingBookingStatus("PENDING")).toBe(true);
    expect(isCapacityBlockingBookingStatus("CONFIRMED")).toBe(true);
    expect(isCapacityBlockingBookingStatus("COMPLETED")).toBe(false);
    expect(isCapacityBlockingBookingStatus("CANCELLED")).toBe(false);
    expect(isCapacityBlockingBookingStatus("NO_SHOW")).toBe(false);
  });

  it("generates 60-minute slots through the exact closing boundary", () => {
    const slots = generate();

    expect(slots).toHaveLength(9);
    expect(slots.at(-1)?.localTimeLabel).toBe("11:00 AM");
    expect(slots[0].endAt.getTime() - slots[0].startAt.getTime()).toBe(
      60 * 60_000,
    );
  });

  it("supports other service durations and the configured interval grid", () => {
    expect(generate({ durationMinutes: 30 })).toHaveLength(11);
    expect(generate({ durationMinutes: 90 })).toHaveLength(7);
    expect(
      generate({
        windows: [{ startLocalMinutes: 550, endLocalMinutes: 660 }],
        durationMinutes: 30,
      })[0].localTimeLabel,
    ).toBe("9:15 AM");
  });

  it("merges overlapping windows without generating slots across a gap", () => {
    const slots = generate({
      windows: [
        { startLocalMinutes: 540, endLocalMinutes: 600 },
        { startLocalMinutes: 780, endLocalMinutes: 1020 },
        { startLocalMinutes: 570, endLocalMinutes: 630 },
      ],
      durationMinutes: 30,
    });

    expect(slots.map((slot) => slot.localTimeLabel)).toEqual([
      "9:00 AM",
      "9:15 AM",
      "9:30 AM",
      "9:45 AM",
      "10:00 AM",
      "1:00 PM",
      "1:15 PM",
      "1:30 PM",
      "1:45 PM",
      "2:00 PM",
      "2:15 PM",
      "2:30 PM",
      "2:45 PM",
      "3:00 PM",
      "3:15 PM",
      "3:30 PM",
      "3:45 PM",
      "4:00 PM",
      "4:15 PM",
      "4:30 PM",
    ]);
  });

  it("uses half-open overlap semantics for blocked intervals", () => {
    const slots = generate({
      blockedIntervals: [
        {
          startAt: DateTime.fromISO("2026-10-01T10:00:00", { zone: timezone }).toJSDate(),
          endAt: DateTime.fromISO("2026-10-01T10:30:00", { zone: timezone }).toJSDate(),
        },
      ],
      durationMinutes: 30,
    });

    expect(slots.map((slot) => slot.localTimeLabel)).toEqual([
      "9:00 AM",
      "9:15 AM",
      "9:30 AM",
      "10:30 AM",
      "10:45 AM",
      "11:00 AM",
      "11:15 AM",
      "11:30 AM",
    ]);
  });

  it("allows a slot exactly at the lead-time cutoff", () => {
    const slots = generate({
      now: DateTime.fromISO("2026-10-01T09:00:00", { zone: timezone })
        .toUTC()
        .toJSDate(),
      bookingLeadMinutes: 60,
    });

    expect(slots[0].localTimeLabel).toBe("10:00 AM");
  });

  it("allows the horizon boundary but rejects dates beyond it", () => {
    expect(
      generate({ date: "2026-10-03", bookingHorizonDays: 2 }),
    ).not.toHaveLength(0);
    expect(
      generate({ date: "2026-10-04", bookingHorizonDays: 2 }),
    ).toHaveLength(0);
  });

  it("skips nonexistent spring-forward local times", () => {
    const slots = generate({
      date: "2026-03-08",
      windows: [{ startLocalMinutes: 0, endLocalMinutes: 300 }],
      durationMinutes: 30,
      slotIntervalMinutes: 30,
      now: DateTime.fromISO("2026-03-07T08:00:00", { zone: timezone })
        .toUTC()
        .toJSDate(),
    });

    expect(slots.map((slot) => slot.localTimeLabel)).not.toContain("2:00 AM");
    expect(slots.map((slot) => slot.localTimeLabel)).not.toContain("2:30 AM");
    expect(new Set(slots.map((slot) => slot.startAt.getTime())).size).toBe(
      slots.length,
    );
  });

  it("chooses one deterministic instant for fall-back ambiguous times", () => {
    const slots = generate({
      date: "2026-11-01",
      windows: [{ startLocalMinutes: 0, endLocalMinutes: 240 }],
      durationMinutes: 30,
      slotIntervalMinutes: 30,
      now: DateTime.fromISO("2026-10-31T08:00:00", { zone: timezone })
        .toUTC()
        .toJSDate(),
    });
    const oneAm = slots.filter((slot) => slot.localTimeLabel === "1:00 AM");

    expect(oneAm).toHaveLength(1);
    expect(new Set(slots.map((slot) => slot.startAt.getTime())).size).toBe(
      slots.length,
    );
    expect(resolveLocalWallTime("2026-11-01", 60, timezone)?.offset).toBe(
      -240,
    );
  });
});

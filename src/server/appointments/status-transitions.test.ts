import { describe, expect, it } from "vitest";

import {
  BOOKING_STATUS_TRANSITIONS,
  canTransitionBookingStatus,
} from "./status-transitions";

describe("booking status transitions", () => {
  it.each([
    ["PENDING", "CONFIRMED"],
    ["PENDING", "CANCELLED"],
    ["CONFIRMED", "COMPLETED"],
    ["CONFIRMED", "CANCELLED"],
    ["CONFIRMED", "NO_SHOW"],
  ] as const)("allows %s to %s", (from, to) => {
    expect(canTransitionBookingStatus(from, to)).toBe(true);
  });

  it.each([
    ["PENDING", "COMPLETED"],
    ["PENDING", "NO_SHOW"],
    ["CONFIRMED", "PENDING"],
    ["COMPLETED", "PENDING"],
    ["CANCELLED", "CONFIRMED"],
    ["NO_SHOW", "CONFIRMED"],
  ] as const)("rejects %s to %s", (from, to) => {
    expect(canTransitionBookingStatus(from, to)).toBe(false);
  });

  it("keeps every terminal status terminal", () => {
    expect(BOOKING_STATUS_TRANSITIONS.COMPLETED).toEqual([]);
    expect(BOOKING_STATUS_TRANSITIONS.CANCELLED).toEqual([]);
    expect(BOOKING_STATUS_TRANSITIONS.NO_SHOW).toEqual([]);
  });
});


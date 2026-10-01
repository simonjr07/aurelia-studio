import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getPublicBookingStatusLabel } from "./public-booking-lookup";

describe("public booking status labels", () => {
  it.each([
    ["PENDING", "Pending"],
    ["CONFIRMED", "Confirmed"],
    ["COMPLETED", "Completed"],
    ["CANCELLED", "Cancelled"],
    ["NO_SHOW", "No-show"],
  ] as const)("maps %s to %s", (status, label) => {
    expect(getPublicBookingStatusLabel(status)).toBe(label);
  });
});


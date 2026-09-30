import { describe, expect, it } from "vitest";

import { DEFAULT_BUSINESS_SETTINGS } from "./business-settings";

describe("default business settings", () => {
  it("uses the approved bootstrap values", () => {
    expect(DEFAULT_BUSINESS_SETTINGS).toMatchObject({
      businessName: "Aurelia Studio",
      timezone: "America/New_York",
      currency: "USD",
      bookingLeadMinutes: 60,
      bookingHorizonDays: 60,
      slotIntervalMinutes: 15,
      cancellationCutoffMinutes: 120,
      rescheduleCutoffMinutes: 240,
    });
  });

  it("keeps the slot interval compatible with an hour", () => {
    expect(60 % DEFAULT_BUSINESS_SETTINGS.slotIntervalMinutes).toBe(0);
  });
});

export const DEFAULT_BUSINESS_SETTINGS = {
  id: "default",
  businessName: "Aurelia Studio",
  timezone: "America/New_York",
  currency: "USD",
  bookingLeadMinutes: 60,
  bookingHorizonDays: 60,
  slotIntervalMinutes: 15,
  cancellationCutoffMinutes: 120,
  rescheduleCutoffMinutes: 240,
} as const;

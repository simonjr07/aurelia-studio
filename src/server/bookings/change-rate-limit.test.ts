import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { consumeBookingChangeRateLimit } from "./change-rate-limit";

describe("public booking change rate limits", () => {
  it("allows five attempts, blocks the sixth, hashes identities, and isolates actions", async () => {
    const counts = new Map<string, number>();
    const stored: string[] = [];
    const increment = vi.fn(async (entries: Array<{ keyHash: string; windowStart: Date }>, action: string) => entries.map((entry) => {
      stored.push(entry.keyHash); const key = `${action}:${entry.keyHash}:${entry.windowStart.toISOString()}`;
      const count = (counts.get(key) ?? 0) + 1; counts.set(key, count); return count;
    }));
    const base = { reference: "AUR-abcdefghijklmnop", email: "Guest@Example.test", networkIdentity: "192.0.2.1", secret: "a-very-long-rate-limit-secret-value", increment } as const;
    for (let attempt = 0; attempt < 5; attempt += 1) expect(await consumeBookingChangeRateLimit({ ...base, action: "PUBLIC_BOOKING_CANCEL" })).toBe(true);
    expect(await consumeBookingChangeRateLimit({ ...base, action: "PUBLIC_BOOKING_CANCEL" })).toBe(false);
    expect(await consumeBookingChangeRateLimit({ ...base, action: "PUBLIC_BOOKING_RESCHEDULE" })).toBe(true);
    expect(stored.join(" ")).not.toContain("Guest"); expect(stored.join(" ")).not.toContain("AUR-"); expect(stored.join(" ")).not.toContain("192.0.2.1");
  });

  it("resets in a later fixed window", async () => {
    const counts = new Map<string, number>();
    const increment = async (entries: Array<{ keyHash: string; windowStart: Date }>, action: string) => entries.map((entry) => { const key = `${action}:${entry.keyHash}:${entry.windowStart.toISOString()}`; const count = (counts.get(key) ?? 0) + 1; counts.set(key, count); return count; });
    const base = { reference: "AUR-abcdefghijklmnop", email: "guest@example.test", secret: "a-very-long-rate-limit-secret-value", action: "PUBLIC_BOOKING_CANCEL" as const, increment };
    for (let attempt = 0; attempt < 6; attempt += 1) await consumeBookingChangeRateLimit({ ...base, now: new Date("2026-10-01T12:00:00Z") });
    expect(await consumeBookingChangeRateLimit({ ...base, now: new Date("2026-10-01T12:15:00Z") })).toBe(true);
  });
});


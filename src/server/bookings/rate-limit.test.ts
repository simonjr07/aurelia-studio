import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  BOOKING_RATE_LIMIT,
  consumeBookingRateLimit,
  type BookingRateLimitRepository,
} from "./rate-limit";
import type { RateLimitIncrement } from "../auth/rate-limit";

function createMemoryRepository() {
  const rows = new Map<string, number>();
  const persisted: RateLimitIncrement[] = [];
  const repository: BookingRateLimitRepository = {
    async incrementBookingBuckets(entries) {
      return entries.map((entry) => {
        persisted.push(entry);
        const key = `${entry.keyHash}:${entry.windowStart.toISOString()}`;
        const count = (rows.get(key) ?? 0) + 1;
        rows.set(key, count);
        return count;
      });
    },
  };

  return { repository, persisted };
}

describe("booking rate limit", () => {
  const secret = "test-only-booking-rate-limit-secret-123456";
  const now = new Date("2026-10-01T12:01:00.000Z");

  it("allows five attempts and enforces the sixth per identity", async () => {
    const { repository } = createMemoryRepository();
    const consume = () =>
      consumeBookingRateLimit({
        emailIdentity: "Guest@Example.test",
        networkIdentity: "192.0.2.1",
        secret,
        now,
        repository,
      });

    for (let attempt = 0; attempt < BOOKING_RATE_LIMIT.attempts; attempt += 1) {
      await expect(consume()).resolves.toBe(true);
    }
    await expect(consume()).resolves.toBe(false);
  });

  it("isolates identities, hashes plaintext, and resets in a new window", async () => {
    const { repository, persisted } = createMemoryRepository();
    const consume = (emailIdentity: string, time = now) =>
      consumeBookingRateLimit({
        emailIdentity,
        secret,
        now: time,
        repository,
      });

    for (let attempt = 0; attempt < BOOKING_RATE_LIMIT.attempts + 1; attempt += 1) {
      await consume("first@example.test");
    }
    await expect(consume("second@example.test")).resolves.toBe(true);
    await expect(
      consume(
        "first@example.test",
        new Date(now.getTime() + BOOKING_RATE_LIMIT.windowMs),
      ),
    ).resolves.toBe(true);

    expect(persisted.every((entry) => /^[a-f0-9]{64}$/.test(entry.keyHash))).toBe(
      true,
    );
    expect(JSON.stringify(persisted)).not.toContain("first@example.test");
  });
});

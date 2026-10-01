import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  BOOKING_LOOKUP_RATE_LIMIT,
  consumeBookingLookupRateLimit,
  type BookingLookupRateLimitRepository,
} from "./lookup-rate-limit";
import type { RateLimitIncrement } from "../auth/rate-limit";

function createMemoryRepository() {
  const counts = new Map<string, number>();
  const persisted: RateLimitIncrement[] = [];
  const repository: BookingLookupRateLimitRepository = {
    async incrementLookupBuckets(entries) {
      return entries.map((entry) => {
        persisted.push(entry);
        const key = `${entry.keyHash}:${entry.windowStart.toISOString()}`;
        const count = (counts.get(key) ?? 0) + 1;
        counts.set(key, count);
        return count;
      });
    },
  };

  return { repository, persisted };
}

describe("public booking lookup rate limit", () => {
  const secret = "test-only-lookup-rate-limit-secret-123456";
  const now = new Date("2026-10-01T12:01:00.000Z");

  it("allows ten attempts and blocks the eleventh", async () => {
    const { repository } = createMemoryRepository();
    const consume = () =>
      consumeBookingLookupRateLimit({
        referenceIdentity: "AUR-AAAAAAAAAAAAAAAA",
        emailIdentity: "Guest@Example.test",
        networkIdentity: "192.0.2.1",
        secret,
        now,
        repository,
      });

    for (let attempt = 0; attempt < BOOKING_LOOKUP_RATE_LIMIT.attempts; attempt += 1) {
      await expect(consume()).resolves.toBe(true);
    }
    await expect(consume()).resolves.toBe(false);
  });

  it("isolates identities, hashes every dimension, and resets by window", async () => {
    const { repository, persisted } = createMemoryRepository();
    const consume = (
      referenceIdentity: string,
      emailIdentity: string,
      time = now,
      networkIdentity = "198.51.100.4",
    ) =>
      consumeBookingLookupRateLimit({
        referenceIdentity,
        emailIdentity,
        networkIdentity,
        secret,
        now: time,
        repository,
      });

    for (let attempt = 0; attempt < BOOKING_LOOKUP_RATE_LIMIT.attempts + 1; attempt += 1) {
      await consume("AUR-AAAAAAAAAAAAAAAA", "first@example.test");
    }
    await expect(
      consume(
        "AUR-BBBBBBBBBBBBBBBB",
        "second@example.test",
        now,
        "198.51.100.5",
      ),
    ).resolves.toBe(true);
    await expect(
      consume(
        "AUR-AAAAAAAAAAAAAAAA",
        "first@example.test",
        new Date(now.getTime() + BOOKING_LOOKUP_RATE_LIMIT.windowMs),
      ),
    ).resolves.toBe(true);

    expect(persisted.every((entry) => /^[a-f0-9]{64}$/.test(entry.keyHash))).toBe(
      true,
    );
    const serialized = JSON.stringify(persisted);
    expect(serialized).not.toContain("AUR-AAAAAAAAAAAAAAAA");
    expect(serialized).not.toContain("first@example.test");
    expect(serialized).not.toContain("198.51.100.4");
  });
});

import { describe, expect, it } from "vitest";

import {
  consumeLoginRateLimit,
  LOGIN_RATE_LIMIT,
  type LoginRateLimitRepository,
  type RateLimitIncrement,
} from "./rate-limit";

const secret = "test-only-rate-limit-secret-with-32-characters";

function createRepository() {
  const counts = new Map<string, number>();
  const storedEntries: RateLimitIncrement[] = [];

  const repository: LoginRateLimitRepository = {
    async incrementLoginBuckets(entries) {
      return entries.map((entry) => {
        storedEntries.push(entry);
        const key = `${entry.keyHash}:${entry.windowStart.toISOString()}`;
        const next = (counts.get(key) ?? 0) + 1;
        counts.set(key, next);
        return next;
      });
    },
  };

  return { repository, storedEntries };
}

describe("login rate limiting", () => {
  it("enforces the threshold", async () => {
    const { repository } = createRepository();
    const now = new Date("2035-01-01T12:00:00.000Z");

    for (let attempt = 0; attempt < LOGIN_RATE_LIMIT.attempts; attempt += 1) {
      await expect(
        consumeLoginRateLimit({
          accountIdentity: "staff@aurelia.test",
          secret,
          now,
          repository,
        }),
      ).resolves.toBe(true);
    }

    await expect(
      consumeLoginRateLimit({
        accountIdentity: "staff@aurelia.test",
        secret,
        now,
        repository,
      }),
    ).resolves.toBe(false);
  });

  it("stores only HMAC identifiers", async () => {
    const { repository, storedEntries } = createRepository();

    await consumeLoginRateLimit({
      accountIdentity: "staff@aurelia.test",
      networkIdentity: "203.0.113.10",
      secret,
      repository,
    });

    expect(storedEntries).toHaveLength(2);
    expect(JSON.stringify(storedEntries)).not.toContain("staff@aurelia.test");
    expect(JSON.stringify(storedEntries)).not.toContain("203.0.113.10");
    expect(storedEntries.every((entry) => entry.keyHash.length === 64)).toBe(
      true,
    );
  });

  it("isolates different account identities", async () => {
    const { repository } = createRepository();
    const now = new Date("2035-01-01T12:00:00.000Z");

    for (let attempt = 0; attempt <= LOGIN_RATE_LIMIT.attempts; attempt += 1) {
      await consumeLoginRateLimit({
        accountIdentity: "first@aurelia.test",
        secret,
        now,
        repository,
      });
    }

    await expect(
      consumeLoginRateLimit({
        accountIdentity: "second@aurelia.test",
        secret,
        now,
        repository,
      }),
    ).resolves.toBe(true);
  });

  it("starts a fresh count after the fixed window expires", async () => {
    const { repository } = createRepository();
    const firstWindow = new Date("2035-01-01T12:00:00.000Z");

    for (let attempt = 0; attempt <= LOGIN_RATE_LIMIT.attempts; attempt += 1) {
      await consumeLoginRateLimit({
        accountIdentity: "staff@aurelia.test",
        secret,
        now: firstWindow,
        repository,
      });
    }

    await expect(
      consumeLoginRateLimit({
        accountIdentity: "staff@aurelia.test",
        secret,
        now: new Date(firstWindow.getTime() + LOGIN_RATE_LIMIT.windowMs),
        repository,
      }),
    ).resolves.toBe(true);
  });
});

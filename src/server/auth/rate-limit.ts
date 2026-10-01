import { createHmac } from "node:crypto";

export const LOGIN_RATE_LIMIT = {
  attempts: 10,
  windowMs: 15 * 60 * 1000,
} as const;

export type RateLimitIncrement = {
  keyHash: string;
  windowStart: Date;
  expiresAt: Date;
};

export type FixedWindowRateLimitRepository = {
  incrementBuckets(entries: RateLimitIncrement[]): Promise<number[]>;
};

export type FixedWindowRateLimitPolicy = {
  attempts: number;
  windowMs: number;
};

export type LoginRateLimitRepository = {
  incrementLoginBuckets(entries: RateLimitIncrement[]): Promise<number[]>;
};

type LoginRateLimitInput = {
  accountIdentity: string;
  networkIdentity?: string;
  secret: string;
  now?: Date;
  repository: LoginRateLimitRepository;
};

export function hashRateLimitIdentity(identity: string, secret: string) {
  if (secret.length < 32) {
    throw new Error("RATE_LIMIT_SECRET must be at least 32 characters.");
  }

  return createHmac("sha256", secret).update(identity).digest("hex");
}

export async function consumeFixedWindowRateLimit({
  identities,
  secret,
  policy,
  repository,
  now = new Date(),
}: {
  identities: string[];
  secret: string;
  policy: FixedWindowRateLimitPolicy;
  repository: FixedWindowRateLimitRepository;
  now?: Date;
}) {
  const windowStartMs =
    Math.floor(now.getTime() / policy.windowMs) * policy.windowMs;
  const windowStart = new Date(windowStartMs);
  const expiresAt = new Date(windowStartMs + policy.windowMs);
  const counts = await repository.incrementBuckets(
    identities.map((identity) => ({
      keyHash: hashRateLimitIdentity(identity, secret),
      windowStart,
      expiresAt,
    })),
  );

  return counts.every((count) => count <= policy.attempts);
}

export async function consumeLoginRateLimit({
  accountIdentity,
  networkIdentity,
  secret,
  now = new Date(),
  repository,
}: LoginRateLimitInput) {
  const identities = [`account:${accountIdentity}`];

  if (networkIdentity) {
    identities.push(`network:${networkIdentity}`);
  }

  return consumeFixedWindowRateLimit({
    identities,
    secret,
    policy: LOGIN_RATE_LIMIT,
    now,
    repository: {
      incrementBuckets: (entries) => repository.incrementLoginBuckets(entries),
    },
  });
}

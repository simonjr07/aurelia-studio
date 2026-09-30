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

export async function consumeLoginRateLimit({
  accountIdentity,
  networkIdentity,
  secret,
  now = new Date(),
  repository,
}: LoginRateLimitInput) {
  const windowStartMs =
    Math.floor(now.getTime() / LOGIN_RATE_LIMIT.windowMs) *
    LOGIN_RATE_LIMIT.windowMs;
  const windowStart = new Date(windowStartMs);
  const expiresAt = new Date(windowStartMs + LOGIN_RATE_LIMIT.windowMs);
  const identities = [`account:${accountIdentity}`];

  if (networkIdentity) {
    identities.push(`network:${networkIdentity}`);
  }

  const counts = await repository.incrementLoginBuckets(
    identities.map((identity) => ({
      keyHash: hashRateLimitIdentity(identity, secret),
      windowStart,
      expiresAt,
    })),
  );

  return counts.every((count) => count <= LOGIN_RATE_LIMIT.attempts);
}

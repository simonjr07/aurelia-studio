import "server-only";

import type { RateLimitAction } from "../../generated/prisma/enums";
import { consumeFixedWindowRateLimit, type RateLimitIncrement } from "../auth/rate-limit";
import { normalizeEmail } from "../auth/validation";
import { getPrismaClient } from "../db/prisma";
import { getRequestNetworkIdentity } from "./rate-limit";

export const BOOKING_CHANGE_RATE_LIMIT = { attempts: 5, windowMs: 15 * 60 * 1000 } as const;

export async function consumeBookingChangeRateLimit(input: { reference: string; email: string; networkIdentity?: string; secret: string; action: RateLimitAction; now?: Date; increment(entries: RateLimitIncrement[], action: RateLimitAction): Promise<number[]> }) {
  const identities = [`reference:${input.reference.trim()}`, `email:${normalizeEmail(input.email)}`];
  if (input.networkIdentity) identities.push(`network:${input.networkIdentity}`);
  return consumeFixedWindowRateLimit({ identities, secret: input.secret, policy: BOOKING_CHANGE_RATE_LIMIT, now: input.now, repository: { incrementBuckets: (entries) => input.increment(entries, input.action) } });
}

export async function enforceBookingChangeRateLimit(input: { reference: string; email: string }, request: Request, action: "PUBLIC_BOOKING_CANCEL" | "PUBLIC_BOOKING_RESCHEDULE") {
  const secret = process.env.RATE_LIMIT_SECRET;
  if (!secret) throw new Error("RATE_LIMIT_SECRET is required for public booking changes.");
  return consumeBookingChangeRateLimit({ ...input, action, secret, networkIdentity: getRequestNetworkIdentity(request), increment: async (entries, bucketAction) => {
    const prisma = getPrismaClient();
    const buckets = await prisma.$transaction(entries.map((entry) => prisma.rateLimitBucket.upsert({
      where: { action_keyHash_windowStart: { action: bucketAction, keyHash: entry.keyHash, windowStart: entry.windowStart } },
      create: { action: bucketAction, ...entry }, update: { requestCount: { increment: 1 }, expiresAt: entry.expiresAt }, select: { requestCount: true },
    })));
    return buckets.map((bucket) => bucket.requestCount);
  } });
}


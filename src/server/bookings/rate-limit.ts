import "server-only";

import { getPrismaClient } from "../db/prisma";
import {
  consumeFixedWindowRateLimit,
  type RateLimitIncrement,
} from "../auth/rate-limit";
import { normalizeEmail } from "../auth/validation";
import { getTrustedNetworkIdentity } from "../security/network-identity";

export const BOOKING_RATE_LIMIT = {
  attempts: 5,
  windowMs: 15 * 60 * 1000,
} as const;

export type BookingRateLimitRepository = {
  incrementBookingBuckets(entries: RateLimitIncrement[]): Promise<number[]>;
};

export function getRequestNetworkIdentity(request: Request) {
  return getTrustedNetworkIdentity(request);
}

export async function consumeBookingRateLimit({
  emailIdentity,
  networkIdentity,
  secret,
  repository,
  now = new Date(),
}: {
  emailIdentity: string;
  networkIdentity?: string;
  secret: string;
  repository: BookingRateLimitRepository;
  now?: Date;
}) {
  const identities = [`booking-email:${normalizeEmail(emailIdentity)}`];

  if (networkIdentity) {
    identities.push(`booking-network:${networkIdentity}`);
  }

  return consumeFixedWindowRateLimit({
    identities,
    secret,
    policy: BOOKING_RATE_LIMIT,
    now,
    repository: {
      incrementBuckets: (entries) => repository.incrementBookingBuckets(entries),
    },
  });
}

const prismaBookingRateLimitRepository: BookingRateLimitRepository = {
  async incrementBookingBuckets(entries) {
    const prisma = getPrismaClient();
    const buckets = await prisma.$transaction(
      entries.map((entry) =>
        prisma.rateLimitBucket.upsert({
          where: {
            action_keyHash_windowStart: {
              action: "BOOKING_CREATE",
              keyHash: entry.keyHash,
              windowStart: entry.windowStart,
            },
          },
          create: {
            action: "BOOKING_CREATE",
            keyHash: entry.keyHash,
            windowStart: entry.windowStart,
            expiresAt: entry.expiresAt,
          },
          update: {
            requestCount: { increment: 1 },
            expiresAt: entry.expiresAt,
          },
          select: { requestCount: true },
        }),
      ),
    );

    return buckets.map((bucket) => bucket.requestCount);
  },
};

export async function enforceBookingRateLimit(
  emailCandidate: unknown,
  request: Request,
) {
  const secret = process.env.RATE_LIMIT_SECRET;

  if (!secret) {
    throw new Error("RATE_LIMIT_SECRET is required for public booking.");
  }

  const emailIdentity =
    typeof emailCandidate === "string"
      ? emailCandidate.slice(0, 320)
      : "invalid-booking-email";

  return consumeBookingRateLimit({
    emailIdentity,
    networkIdentity: getRequestNetworkIdentity(request),
    secret,
    repository: prismaBookingRateLimitRepository,
  });
}


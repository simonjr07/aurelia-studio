import "server-only";

import {
  consumeFixedWindowRateLimit,
  type RateLimitIncrement,
} from "../auth/rate-limit";
import { normalizeEmail } from "../auth/validation";
import { getPrismaClient } from "../db/prisma";
import { getRequestNetworkIdentity } from "./rate-limit";

export const BOOKING_LOOKUP_RATE_LIMIT = {
  attempts: 10,
  windowMs: 15 * 60 * 1000,
} as const;

export type BookingLookupRateLimitRepository = {
  incrementLookupBuckets(entries: RateLimitIncrement[]): Promise<number[]>;
};

export async function consumeBookingLookupRateLimit({
  referenceIdentity,
  emailIdentity,
  networkIdentity,
  secret,
  repository,
  now = new Date(),
}: {
  referenceIdentity: string;
  emailIdentity: string;
  networkIdentity?: string;
  secret: string;
  repository: BookingLookupRateLimitRepository;
  now?: Date;
}) {
  const identities = [
    `lookup-reference:${referenceIdentity.trim()}`,
    `lookup-email:${normalizeEmail(emailIdentity)}`,
  ];

  if (networkIdentity) {
    identities.push(`lookup-network:${networkIdentity}`);
  }

  return consumeFixedWindowRateLimit({
    identities,
    secret,
    policy: BOOKING_LOOKUP_RATE_LIMIT,
    now,
    repository: {
      incrementBuckets: (entries) => repository.incrementLookupBuckets(entries),
    },
  });
}

const prismaBookingLookupRateLimitRepository: BookingLookupRateLimitRepository = {
  async incrementLookupBuckets(entries) {
    const prisma = getPrismaClient();
    const buckets = await prisma.$transaction(
      entries.map((entry) =>
        prisma.rateLimitBucket.upsert({
          where: {
            action_keyHash_windowStart: {
              action: "PUBLIC_BOOKING_LOOKUP",
              keyHash: entry.keyHash,
              windowStart: entry.windowStart,
            },
          },
          create: {
            action: "PUBLIC_BOOKING_LOOKUP",
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

export async function enforceBookingLookupRateLimit(
  input: { reference: string; email: string },
  request: Request,
) {
  const secret = process.env.RATE_LIMIT_SECRET;

  if (!secret) {
    throw new Error("RATE_LIMIT_SECRET is required for public booking lookup.");
  }

  return consumeBookingLookupRateLimit({
    referenceIdentity: input.reference,
    emailIdentity: input.email,
    networkIdentity: getRequestNetworkIdentity(request),
    secret,
    repository: prismaBookingLookupRateLimitRepository,
  });
}


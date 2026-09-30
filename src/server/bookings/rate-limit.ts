import "server-only";

import { getPrismaClient } from "../db/prisma";
import { hashRateLimitIdentity, type RateLimitIncrement } from "../auth/rate-limit";
import { normalizeEmail } from "../auth/validation";

export const BOOKING_RATE_LIMIT = {
  attempts: 5,
  windowMs: 15 * 60 * 1000,
} as const;

export type BookingRateLimitRepository = {
  incrementBookingBuckets(entries: RateLimitIncrement[]): Promise<number[]>;
};

export function getRequestNetworkIdentity(request: Request) {
  const forwardedFor =
    request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip");

  return forwardedFor?.split(",", 1)[0]?.trim().slice(0, 128) || undefined;
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
  const windowStartMs =
    Math.floor(now.getTime() / BOOKING_RATE_LIMIT.windowMs) *
    BOOKING_RATE_LIMIT.windowMs;
  const windowStart = new Date(windowStartMs);
  const expiresAt = new Date(windowStartMs + BOOKING_RATE_LIMIT.windowMs);
  const identities = [`booking-email:${normalizeEmail(emailIdentity)}`];

  if (networkIdentity) {
    identities.push(`booking-network:${networkIdentity}`);
  }

  const counts = await repository.incrementBookingBuckets(
    identities.map((identity) => ({
      keyHash: hashRateLimitIdentity(identity, secret),
      windowStart,
      expiresAt,
    })),
  );

  return counts.every((count) => count <= BOOKING_RATE_LIMIT.attempts);
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


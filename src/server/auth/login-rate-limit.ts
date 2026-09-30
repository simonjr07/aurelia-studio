import "server-only";

import { getPrismaClient } from "@/server/db/prisma";

import {
  consumeLoginRateLimit,
  type LoginRateLimitRepository,
} from "./rate-limit";
import { normalizeEmail } from "./validation";

const prismaLoginRateLimitRepository: LoginRateLimitRepository = {
  async incrementLoginBuckets(entries) {
    const prisma = getPrismaClient();
    const buckets = await prisma.$transaction(
      entries.map((entry) =>
        prisma.rateLimitBucket.upsert({
          where: {
            action_keyHash_windowStart: {
              action: "LOGIN",
              keyHash: entry.keyHash,
              windowStart: entry.windowStart,
            },
          },
          create: {
            action: "LOGIN",
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

function getNetworkIdentity(request: Request) {
  const forwardedFor =
    request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip");

  const firstAddress = forwardedFor?.split(",", 1)[0]?.trim();

  return firstAddress ? firstAddress.slice(0, 128) : undefined;
}

export async function enforceLoginRateLimit(
  emailCandidate: unknown,
  request: Request,
) {
  const secret = process.env.RATE_LIMIT_SECRET;

  if (!secret) {
    throw new Error("RATE_LIMIT_SECRET is required for staff sign-in.");
  }

  const accountIdentity = normalizeEmail(
    typeof emailCandidate === "string"
      ? emailCandidate.slice(0, 320)
      : "invalid-account-input",
  );

  return consumeLoginRateLimit({
    accountIdentity,
    networkIdentity: getNetworkIdentity(request),
    secret,
    repository: prismaLoginRateLimitRepository,
  });
}

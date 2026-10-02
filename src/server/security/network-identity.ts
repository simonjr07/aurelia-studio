import "server-only";

const MAX_NETWORK_IDENTITY_LENGTH = 128;

/**
 * Returns a client network identity only when the request came through
 * Vercel's trusted proxy. Headers such as x-forwarded-for can otherwise be
 * supplied by an untrusted client and must not become a rate-limit key.
 */
export function getTrustedNetworkIdentity(request: Request) {
  if (process.env.VERCEL !== "1") {
    return undefined;
  }

  const firstAddress = request.headers
    .get("x-vercel-forwarded-for")
    ?.split(",", 1)[0]
    ?.trim();

  return firstAddress
    ? firstAddress.slice(0, MAX_NETWORK_IDENTITY_LENGTH)
    : undefined;
}

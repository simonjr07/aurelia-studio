import { randomBytes } from "node:crypto";

export const BOOKING_REFERENCE_PATTERN = /^AUR-[A-Za-z0-9_-]{16}$/;

type RandomBytes = (size: number) => Buffer;

export function createBookingReference(random: RandomBytes = randomBytes) {
  return `AUR-${random(12).toString("base64url")}`;
}


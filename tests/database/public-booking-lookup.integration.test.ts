import "dotenv/config";

import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { POST as lookupBookingEndpoint } from "../../src/app/api/bookings/lookup/route";
import {
  PublicBookingVerificationError,
  verifyPublicBooking,
} from "../../src/server/bookings/public-booking-lookup";
import { createScriptDatabaseClient } from "../../scripts/database-client";

const hasDatabaseUrl = Boolean(process.env.DIRECT_URL ?? process.env.DATABASE_URL);

describe.skipIf(!hasDatabaseUrl)("public booking lookup", () => {
  const prisma = createScriptDatabaseClient();
  const runId = randomUUID();
  const staffId = randomUUID();
  const serviceId = randomUUID();
  const customerEmail = `lookup-${runId}@example.test`;
  const references = {
    PENDING: "AUR-LOOKUPPENDING001",
    CONFIRMED: "AUR-LOOKUPCONFIRM001",
    COMPLETED: "AUR-LOOKUPCOMPLETE01",
    CANCELLED: "AUR-LOOKUPCANCELLED1",
    NO_SHOW: "AUR-LOOKUPNOSHOW0001",
  } as const;
  const originalRateLimitSecret = process.env.RATE_LIMIT_SECRET;

  function lookupRequest(
    reference: string,
    email: string,
    network = "192.0.2.70",
  ) {
    return new Request("http://localhost/api/bookings/lookup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": network,
      },
      body: JSON.stringify({ reference, email }),
    });
  }

  beforeAll(async () => {
    process.env.RATE_LIMIT_SECRET = "integration-lookup-rate-limit-secret-123456";
    await prisma.user.create({
      data: {
        id: staffId,
        email: `private-staff-${runId}@example.test`,
        name: "Safe Public Professional",
        passwordHash: "private-integration-password-hash",
        role: "ADMIN",
        status: "ACTIVE",
      },
    });
    await prisma.service.create({
      data: {
        id: serviceId,
        name: "Changed Live Service Name",
        slug: `lookup-${runId}`,
        description: "Synthetic public lookup integration service.",
        durationMinutes: 15,
        priceCents: 999,
        currency: "CAD",
        isPublished: true,
        isActive: true,
      },
    });

    let hour = 13;
    for (const [status, publicReference] of Object.entries(references)) {
      await prisma.booking.create({
        data: {
          publicReference,
          status: status as keyof typeof references,
          serviceId,
          staffId,
          customerName: "Lookup Guest",
          customerEmail,
          customerPhone: "+1 555 010 7070",
          customerNote: "Private customer note.",
          startAt: new Date(`2026-10-16T${hour}:00:00.000Z`),
          endAt: new Date(`2026-10-16T${hour + 1}:30:00.000Z`),
          timezoneSnapshot: "America/New_York",
          serviceNameSnapshot: "Original Signature Treatment",
          serviceDurationSnapshot: 90,
          priceCentsSnapshot: 22_500,
          currencySnapshot: "USD",
        },
      });
      hour += 2;
    }
  });

  afterAll(async () => {
    if (originalRateLimitSecret === undefined) {
      delete process.env.RATE_LIMIT_SECRET;
    } else {
      process.env.RATE_LIMIT_SECRET = originalRateLimitSecret;
    }
    await prisma.rateLimitBucket.deleteMany({
      where: { action: "PUBLIC_BOOKING_LOOKUP" },
    });
    await prisma.booking.deleteMany({ where: { serviceId } });
    await prisma.service.deleteMany({ where: { id: serviceId } });
    await prisma.user.deleteMany({ where: { id: staffId } });
    await prisma.$disconnect();
  });

  it("requires a normalized matching email and returns snapshot-backed safe data", async () => {
    const result = await verifyPublicBooking({
      reference: `  ${references.PENDING}  `,
      email: `  ${customerEmail.toUpperCase()}  `,
    });

    expect(result).toEqual({
      reference: references.PENDING,
      status: "PENDING",
      statusLabel: "Pending",
      serviceName: "Original Signature Treatment",
      staffName: "Safe Public Professional",
      startAt: "2026-10-16T13:00:00.000Z",
      endAt: "2026-10-16T14:30:00.000Z",
      timezone: "America/New_York",
      durationMinutes: 90,
      priceCents: 22_500,
      currency: "USD",
      customerName: "Lookup Guest",
    });
    expect(Object.keys(result).sort()).toEqual(
      [
        "currency",
        "customerName",
        "durationMinutes",
        "endAt",
        "priceCents",
        "reference",
        "serviceName",
        "staffName",
        "startAt",
        "status",
        "statusLabel",
        "timezone",
      ].sort(),
    );
    expect(JSON.stringify(result)).not.toContain(staffId);
    expect(JSON.stringify(result)).not.toContain(customerEmail);
    expect(JSON.stringify(result)).not.toContain("Private customer note");
    expect(JSON.stringify(result)).not.toContain("Changed Live Service Name");
  });

  it("uses the same generic domain failure for wrong email and unknown reference", async () => {
    await expect(
      verifyPublicBooking({
        reference: references.PENDING,
        email: "wrong@example.test",
      }),
    ).rejects.toBeInstanceOf(PublicBookingVerificationError);
    await expect(
      verifyPublicBooking({
        reference: "AUR-UNKNOWNREF000001",
        email: customerEmail,
      }),
    ).rejects.toBeInstanceOf(PublicBookingVerificationError);
  });

  it("supports every stored status through the API-safe label mapping", async () => {
    const expected = {
      PENDING: "Pending",
      CONFIRMED: "Confirmed",
      COMPLETED: "Completed",
      CANCELLED: "Cancelled",
      NO_SHOW: "No-show",
    } as const;

    for (const [status, reference] of Object.entries(references)) {
      const result = await verifyPublicBooking({ reference, email: customerEmail });
      expect(result.statusLabel).toBe(expected[status as keyof typeof expected]);
    }
  });

  it("returns safe API outcomes with identical verification failures and no-store headers", async () => {
    const success = await lookupBookingEndpoint(
      lookupRequest(references.CONFIRMED, customerEmail, "192.0.2.71"),
    );
    const successBody = await success.json();
    expect(success.status).toBe(200);
    expect(success.headers.get("cache-control")).toContain("no-store");
    expect(success.headers.get("pragma")).toBe("no-cache");
    expect(successBody.staffName).toBe("Safe Public Professional");
    expect(JSON.stringify(successBody)).not.toContain("passwordHash");
    expect(JSON.stringify(successBody)).not.toContain("serviceId");

    const wrongEmail = await lookupBookingEndpoint(
      lookupRequest(references.COMPLETED, "wrong@example.test", "192.0.2.72"),
    );
    const unknown = await lookupBookingEndpoint(
      lookupRequest("AUR-UNKNOWNREF000002", customerEmail, "192.0.2.73"),
    );
    expect(wrongEmail.status).toBe(404);
    expect(unknown.status).toBe(404);
    expect(await wrongEmail.json()).toEqual(await unknown.json());

    const malformed = await lookupBookingEndpoint(
      lookupRequest("not-a-reference", "not-an-email", "192.0.2.74"),
    );
    expect(malformed.status).toBe(400);
    expect((await malformed.json()).fieldErrors).toEqual(
      expect.objectContaining({ reference: expect.any(Array), email: expect.any(Array) }),
    );
  });

  it("persists only hashed lookup identities and enforces the threshold", async () => {
    const reference = "AUR-RATELIMITLOOKUP1";
    const email = `rate-${runId}@example.test`;
    const network = "198.51.100.77";

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await lookupBookingEndpoint(
        lookupRequest(reference, email, network),
      );
      expect(response.status).toBe(404);
    }
    const limited = await lookupBookingEndpoint(
      lookupRequest(reference, email, network),
    );
    expect(limited.status).toBe(429);

    const buckets = await prisma.rateLimitBucket.findMany({
      where: { action: "PUBLIC_BOOKING_LOOKUP" },
      select: { keyHash: true },
    });
    expect(buckets.length).toBeGreaterThanOrEqual(3);
    expect(buckets.every((bucket) => /^[a-f0-9]{64}$/.test(bucket.keyHash))).toBe(
      true,
    );
    const serialized = JSON.stringify(buckets);
    expect(serialized).not.toContain(reference);
    expect(serialized).not.toContain(email);
    expect(serialized).not.toContain(network);
  });

  it("returns a generic 500 when the lookup boundary cannot initialize", async () => {
    delete process.env.RATE_LIMIT_SECRET;
    const response = await lookupBookingEndpoint(
      lookupRequest(references.CANCELLED, customerEmail, "192.0.2.75"),
    );
    process.env.RATE_LIMIT_SECRET = "integration-lookup-rate-limit-secret-123456";

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Booking lookup is temporarily unavailable.",
    });
  });
});


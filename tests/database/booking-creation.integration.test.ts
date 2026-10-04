import "dotenv/config";

import { randomUUID } from "node:crypto";

import { DateTime } from "luxon";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { POST as createBookingEndpoint } from "../../src/app/api/bookings/route";
import {
  BookingConflictError,
  BookingServiceUnavailableError,
  createPublicBooking,
} from "../../src/server/bookings/create-public-booking";
import { createScriptDatabaseClient } from "../../scripts/database-client";

const hasDatabaseUrl = Boolean(process.env.DIRECT_URL ?? process.env.DATABASE_URL);

describe.skipIf(!hasDatabaseUrl)("public booking creation", () => {
  const prisma = createScriptDatabaseClient();
  const runId = randomUUID();
  const staffIds = [randomUUID(), randomUUID()].sort();
  const disabledStaffId = randomUUID();
  const unassignedStaffId = randomUUID();
  const serviceId = randomUUID();
  const hiddenServiceId = randomUUID();
  const inactiveServiceId = randomUUID();
  const serviceSlug = `booking-${runId}`;
  const hiddenSlug = `booking-hidden-${runId}`;
  const inactiveSlug = `booking-inactive-${runId}`;
  const fixedNow = DateTime.fromISO("2026-10-01T08:00:00", {
    zone: "America/New_York",
  }).toJSDate();

  function at(time: string) {
    return DateTime.fromISO(`2026-10-05T${time}:00`, {
      zone: "America/New_York",
    }).toUTC().toISO()!;
  }

  function candidate(time: string, overrides: Record<string, unknown> = {}) {
    return {
      serviceSlug,
      staffId: staffIds[0],
      startAt: at(time),
      customerName: "  Booking Guest  ",
      customerEmail: `GUEST-${runId}@Example.test`,
      customerPhone: "+1 (555) 010-0200",
      customerNote: "  Quiet room, please.  ",
      ...overrides,
    };
  }

  beforeAll(async () => {
    await prisma.user.createMany({
      data: [
        ...staffIds.map((id, index) => ({
          id,
          email: `booking-staff-${index}-${runId}@example.test`,
          name: `Booking Staff ${index + 1}`,
          passwordHash: "integration-test-only",
          role: "STAFF" as const,
          status: "ACTIVE" as const,
        })),
        {
          id: disabledStaffId,
          email: `booking-disabled-${runId}@example.test`,
          name: "Disabled Booking Staff",
          passwordHash: "integration-test-only",
          role: "STAFF",
          status: "DISABLED",
        },
        {
          id: unassignedStaffId,
          email: `booking-unassigned-${runId}@example.test`,
          name: "Unassigned Booking Staff",
          passwordHash: "integration-test-only",
          role: "STAFF",
          status: "ACTIVE",
        },
      ],
    });
    await prisma.service.createMany({
      data: [
        {
          id: serviceId,
          name: "Authoritative Booking Service",
          slug: serviceSlug,
          description: "Synthetic booking integration service.",
          durationMinutes: 60,
          priceCents: 12_345,
          currency: "USD",
          isPublished: true,
          isActive: true,
        },
        {
          id: hiddenServiceId,
          name: "Hidden Booking Service",
          slug: hiddenSlug,
          description: "Synthetic hidden service.",
          durationMinutes: 30,
          priceCents: 5_000,
          currency: "USD",
          isPublished: false,
          isActive: true,
        },
        {
          id: inactiveServiceId,
          name: "Inactive Booking Service",
          slug: inactiveSlug,
          description: "Synthetic inactive service.",
          durationMinutes: 30,
          priceCents: 5_000,
          currency: "USD",
          isPublished: true,
          isActive: false,
        },
      ],
    });
    await prisma.staffService.createMany({
      data: [
        ...staffIds.map((staffId) => ({ staffId, serviceId })),
        { staffId: disabledStaffId, serviceId },
      ],
    });
    await prisma.availabilityRule.createMany({
      data: [...staffIds, disabledStaffId].map((staffId) => ({
        staffId,
        weekday: "MONDAY" as const,
        startLocalMinutes: 540,
        endLocalMinutes: 1020,
      })),
    });
  });

  afterAll(async () => {
    await prisma.rateLimitBucket.deleteMany({ where: { action: "BOOKING_CREATE" } });
    await prisma.booking.deleteMany({ where: { serviceId } });
    await prisma.availabilityRule.deleteMany({
      where: { staffId: { in: [...staffIds, disabledStaffId] } },
    });
    await prisma.staffService.deleteMany({ where: { serviceId } });
    await prisma.service.deleteMany({ where: { id: { in: [serviceId, hiddenServiceId, inactiveServiceId] } } });
    await prisma.user.deleteMany({
      where: { id: { in: [...staffIds, disabledStaffId, unassignedStaffId] } },
    });
    await prisma.$disconnect();
  });

  it("creates a PENDING booking and initial event with authoritative snapshots", async () => {
    const result = await createPublicBooking(candidate("09:00"), {
      now: fixedNow,
      generateReference: () => "AUR-AAAAAAAAAAAAAAAA",
    });
    const stored = await prisma.booking.findUnique({
      where: { publicReference: result.reference },
      include: { statusEvents: true },
    });

    expect(result).toEqual({
      reference: "AUR-AAAAAAAAAAAAAAAA",
      status: "PENDING",
      serviceName: "Authoritative Booking Service",
      staffName: "Booking Staff 1",
      startAt: new Date(at("09:00")).toISOString(),
      endAt: new Date(at("10:00")).toISOString(),
      timezone: "America/New_York",
      durationMinutes: 60,
      priceCents: 12_345,
      currency: "USD",
    });
    expect(stored).toMatchObject({
      status: "PENDING",
      customerName: "Booking Guest",
      customerEmail: `guest-${runId}@example.test`,
      customerNote: "Quiet room, please.",
      timezoneSnapshot: "America/New_York",
      serviceNameSnapshot: "Authoritative Booking Service",
      serviceDurationSnapshot: 60,
      priceCentsSnapshot: 12_345,
      currencySnapshot: "USD",
    });
    expect(stored?.statusEvents).toEqual([
      expect.objectContaining({
        fromStatus: null,
        toStatus: "PENDING",
        changedByUserId: null,
      }),
    ]);
  });

  it("rejects unassigned and disabled specific staff", async () => {
    await expect(
      createPublicBooking(candidate("10:00", { staffId: unassignedStaffId }), {
        now: fixedNow,
      }),
    ).rejects.toBeInstanceOf(BookingConflictError);
    await expect(
      createPublicBooking(candidate("10:00", { staffId: disabledStaffId }), {
        now: fixedNow,
      }),
    ).rejects.toBeInstanceOf(BookingConflictError);
  });

  it("assigns Any available deterministically and ignores unavailable staff", async () => {
    await createPublicBooking(candidate("10:00"), { now: fixedNow });
    const fallback = await createPublicBooking(
      candidate("10:00", { staffId: undefined }),
      { now: fixedNow },
    );
    const deterministic = await createPublicBooking(
      candidate("11:00", { staffId: undefined }),
      { now: fixedNow },
    );
    const fallbackStored = await prisma.booking.findUnique({
      where: { publicReference: fallback.reference },
    });
    const deterministicStored = await prisma.booking.findUnique({
      where: { publicReference: deterministic.reference },
    });

    expect(fallbackStored?.staffId).toBe(staffIds[1]);
    expect(deterministicStored?.staffId).toBe(staffIds[0]);
  });

  it("conflicts when no eligible staff remains available", async () => {
    await createPublicBooking(candidate("12:00"), { now: fixedNow });
    await createPublicBooking(candidate("12:00", { staffId: staffIds[1] }), {
      now: fixedNow,
    });
    await expect(
      createPublicBooking(candidate("12:00", { staffId: undefined }), {
        now: fixedNow,
      }),
    ).rejects.toBeInstanceOf(BookingConflictError);
  });

  it("rejects unpublished and inactive services", async () => {
    await expect(
      createPublicBooking(candidate("13:00", { serviceSlug: hiddenSlug }), {
        now: fixedNow,
      }),
    ).rejects.toBeInstanceOf(BookingServiceUnavailableError);
    await expect(
      createPublicBooking(candidate("13:00", { serviceSlug: inactiveSlug }), {
        now: fixedNow,
      }),
    ).rejects.toBeInstanceOf(BookingServiceUnavailableError);
  });

  it("retries the whole transaction after a booking-reference collision", async () => {
    const references = ["AUR-AAAAAAAAAAAAAAAA", "AUR-AQEBAQEBAQEBAQEB"];
    const result = await createPublicBooking(candidate("13:00"), {
      now: fixedNow,
      generateReference: () => references.shift()!,
    });

    expect(result.reference).toBe("AUR-AQEBAQEBAQEBAQEB");
  });

  it("lets PostgreSQL resolve two concurrent attempts with one conflict", async () => {
    const attempts = await Promise.allSettled([
      createPublicBooking(candidate("14:00"), { now: fixedNow }),
      createPublicBooking(candidate("14:00"), { now: fixedNow }),
    ]);
    const fulfilled = attempts.filter((attempt) => attempt.status === "fulfilled");
    const rejected = attempts.filter((attempt) => attempt.status === "rejected");
    const stored = await prisma.booking.count({
      where: { serviceId, staffId: staffIds[0], startAt: new Date(at("14:00")) },
    });

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]).toMatchObject({ reason: expect.any(BookingConflictError) });
    expect(stored).toBe(1);
  });

  it("returns safe API validation, success, conflict, not found, and rate limit responses", async () => {
    process.env.RATE_LIMIT_SECRET = "integration-booking-rate-secret-123456789";
    const malformed = await createBookingEndpoint(
      new Request("http://localhost/api/bookings", {
        method: "POST",
        body: JSON.stringify({ customerEmail: "bad" }),
      }),
    );
    expect(malformed.status).toBe(400);

    const apiEmail = `api-${runId}@example.test`;
    const makeRequest = (time: string, slug = serviceSlug) =>
      new Request("http://localhost/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": `192.0.2.${runId.charCodeAt(0)}`,
        },
        body: JSON.stringify(
          candidate(time, { serviceSlug: slug, customerEmail: apiEmail }),
        ),
      });

    const success = await createBookingEndpoint(makeRequest("15:00"));
    const successBody = await success.json();
    expect(success.status).toBe(201);
    expect(Object.keys(successBody).sort()).toEqual(
      ["currency", "durationMinutes", "endAt", "priceCents", "reference", "serviceName", "staffName", "startAt", "status", "timezone"].sort(),
    );

    const conflict = await createBookingEndpoint(makeRequest("15:00"));
    expect(conflict.status).toBe(409);
    const missing = await createBookingEndpoint(makeRequest("16:00", "missing-service"));
    expect(missing.status).toBe(404);

    await createBookingEndpoint(makeRequest("15:00"));
    await createBookingEndpoint(makeRequest("15:00"));
    const limited = await createBookingEndpoint(makeRequest("15:00"));
    expect(limited.status).toBe(429);
  });
});

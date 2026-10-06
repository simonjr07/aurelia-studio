import "dotenv/config";

import { DateTime } from "luxon";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { GET as getAvailability } from "../../src/app/api/availability/route";
import { BookingStatus, Role, UserStatus, Weekday } from "../../src/generated/prisma/enums";
import {
  AvailabilityStaffNotEligibleError,
  PublicServiceNotFoundError,
  getServiceAvailability,
} from "../../src/server/availability/availability-service";
import { createScriptDatabaseClient } from "../../scripts/database-client";

const hasDatabaseUrl = Boolean(
  process.env.DIRECT_URL ?? process.env.DATABASE_URL,
);

describe.skipIf(!hasDatabaseUrl)("availability service", () => {
  const prisma = createScriptDatabaseClient();
  const runId = randomUUID();
  const activeStaffId = randomUUID();
  const disabledStaffId = randomUUID();
  const unassignedStaffId = randomUUID();
  const serviceId = randomUUID();
  const unpublishedServiceId = randomUUID();
  const inactiveServiceId = randomUUID();
  const serviceSlug = `availability-${runId}`;
  const unpublishedSlug = `availability-hidden-${runId}`;
  const inactiveSlug = `availability-inactive-${runId}`;
  const requestedDate = "2026-10-05";
  const fixedNow = DateTime.fromISO("2026-10-01T08:00:00", {
    zone: "America/New_York",
  })
    .toUTC()
    .toJSDate();

  function at(localTime: string) {
    return DateTime.fromISO(`2026-10-05T${localTime}:00`, {
      zone: "America/New_York",
    }).toJSDate();
  }

  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(fixedNow);
    await prisma.user.createMany({
      data: [
        {
          id: activeStaffId,
          email: `availability-active-${runId}@example.test`,
          name: "Availability Active",
          passwordHash: "integration-test-only",
          role: Role.STAFF,
          status: UserStatus.ACTIVE,
        },
        {
          id: disabledStaffId,
          email: `availability-disabled-${runId}@example.test`,
          name: "Availability Disabled",
          passwordHash: "integration-test-only",
          role: Role.STAFF,
          status: UserStatus.DISABLED,
        },
        {
          id: unassignedStaffId,
          email: `availability-unassigned-${runId}@example.test`,
          name: "Availability Unassigned",
          passwordHash: "integration-test-only",
          role: Role.ADMIN,
          status: UserStatus.ACTIVE,
        },
      ],
    });

    await prisma.service.createMany({
      data: [
        {
          id: serviceId,
          name: "Availability Test Service",
          slug: serviceSlug,
          description: "Integration service.",
          durationMinutes: 60,
          priceCents: 10_000,
          currency: "USD",
          isPublished: true,
          isActive: true,
        },
        {
          id: unpublishedServiceId,
          name: "Availability Hidden Service",
          slug: unpublishedSlug,
          description: "Hidden integration service.",
          durationMinutes: 60,
          priceCents: 10_000,
          currency: "USD",
          isPublished: false,
          isActive: true,
        },
        {
          id: inactiveServiceId,
          name: "Availability Inactive Service",
          slug: inactiveSlug,
          description: "Inactive integration service.",
          durationMinutes: 60,
          priceCents: 10_000,
          currency: "USD",
          isPublished: true,
          isActive: false,
        },
      ],
    });

    await prisma.staffService.create({
      data: { staffId: activeStaffId, serviceId },
    });
    await prisma.staffService.create({
      data: { staffId: disabledStaffId, serviceId },
    });

    await prisma.availabilityRule.create({
      data: {
        staffId: activeStaffId,
        weekday: Weekday.MONDAY,
        startLocalMinutes: 540,
        endLocalMinutes: 780,
      },
    });
    await prisma.availabilityRule.create({
      data: {
        staffId: disabledStaffId,
        weekday: Weekday.MONDAY,
        startLocalMinutes: 540,
        endLocalMinutes: 780,
      },
    });

    await prisma.booking.createMany({
      data: [
        {
          publicReference: `AVAIL-${runId.slice(0, 20)}`,
          status: BookingStatus.PENDING,
          serviceId,
          staffId: activeStaffId,
          customerName: "Test Customer",
          customerEmail: "test@example.test",
          customerPhone: "+10000000000",
          startAt: at("10:00"),
          endAt: at("11:00"),
          timezoneSnapshot: "America/New_York",
          serviceNameSnapshot: "Availability Test Service",
          serviceDurationSnapshot: 60,
          priceCentsSnapshot: 10_000,
          currencySnapshot: "USD",
        },
        {
          publicReference: `AVAIL-C-${runId.slice(0, 19)}`,
          status: BookingStatus.COMPLETED,
          serviceId,
          staffId: activeStaffId,
          customerName: "Test Customer",
          customerEmail: "test@example.test",
          customerPhone: "+10000000000",
          startAt: at("11:00"),
          endAt: at("12:00"),
          timezoneSnapshot: "America/New_York",
          serviceNameSnapshot: "Availability Test Service",
          serviceDurationSnapshot: 60,
          priceCentsSnapshot: 10_000,
          currencySnapshot: "USD",
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.booking.deleteMany({
      where: { publicReference: { startsWith: "AVAIL-" } },
    });
    await prisma.availabilityRule.deleteMany({
      where: { staffId: { in: [activeStaffId, disabledStaffId] } },
    });
    await prisma.staffService.deleteMany({
      where: { serviceId },
    });
    await prisma.service.deleteMany({
      where: { id: { in: [serviceId, unpublishedServiceId, inactiveServiceId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [activeStaffId, disabledStaffId, unassignedStaffId] } },
    });
    await prisma.$disconnect();
    vi.useRealTimers();
  });

  it("filters blocking bookings while retaining completed capacity", async () => {
    const result = await getServiceAvailability({
      serviceSlug,
      date: requestedDate,
      now: fixedNow,
    });

    expect(result.service.slug).toBe(serviceSlug);
    expect(result.slots.map((slot) => slot.localTimeLabel)).toEqual([
      "9:00 AM",
      "11:00 AM",
      "11:15 AM",
      "11:30 AM",
      "11:45 AM",
      "12:00 PM",
    ]);
    expect(result.slots[0].eligibleStaff).toEqual([
      { id: activeStaffId, name: "Availability Active" },
    ]);
  });

  it("requires an active assigned staff member when staff is selected", async () => {
    await expect(
      getServiceAvailability({
        serviceSlug,
        date: requestedDate,
        staffId: disabledStaffId,
        now: fixedNow,
      }),
    ).rejects.toBeInstanceOf(AvailabilityStaffNotEligibleError);

    await expect(
      getServiceAvailability({
        serviceSlug,
        date: requestedDate,
        staffId: unassignedStaffId,
        now: fixedNow,
      }),
    ).rejects.toBeInstanceOf(AvailabilityStaffNotEligibleError);
  });

  it("hides unpublished and inactive services", async () => {
    await expect(
      getServiceAvailability({
        serviceSlug: unpublishedSlug,
        date: requestedDate,
        now: fixedNow,
      }),
    ).rejects.toBeInstanceOf(PublicServiceNotFoundError);
    await expect(
      getServiceAvailability({
        serviceSlug: inactiveSlug,
        date: requestedDate,
        now: fixedNow,
      }),
    ).rejects.toBeInstanceOf(PublicServiceNotFoundError);
  });

  it("returns a safe JSON response and validates the public endpoint", async () => {
    const response = await getAvailability(
      new NextRequest(
        `http://localhost/api/availability?service=${serviceSlug}&date=${requestedDate}`,
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.service).toEqual({
      id: serviceId,
      slug: serviceSlug,
      name: "Availability Test Service",
      durationMinutes: 60,
    });
    expect(body.slots[0].eligibleStaff).toEqual([
      { id: activeStaffId, name: "Availability Active" },
    ]);
    expect(JSON.stringify(body)).not.toContain("passwordHash");
    expect(JSON.stringify(body)).not.toContain("test@example.test");

    const invalidDateResponse = await getAvailability(
      new NextRequest(
        `http://localhost/api/availability?service=${serviceSlug}&date=2026-02-30`,
      ),
    );
    expect(invalidDateResponse.status).toBe(400);

    const missingServiceResponse = await getAvailability(
      new NextRequest(
        "http://localhost/api/availability?service=missing-service&date=2026-10-05",
      ),
    );
    expect(missingServiceResponse.status).toBe(404);
  });
});

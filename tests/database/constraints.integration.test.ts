import "dotenv/config";

import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createScriptDatabaseClient } from "../../scripts/database-client";

const hasDatabaseUrl = Boolean(
  process.env.DIRECT_URL ?? process.env.DATABASE_URL,
);

describe.skipIf(!hasDatabaseUrl)("PostgreSQL booking constraints", () => {
  let prisma: ReturnType<typeof createScriptDatabaseClient>;
  const runId = randomUUID();
  const staffId = randomUUID();
  const serviceId = randomUUID();
  const email = `database-test-${runId}@example.test`;

  beforeAll(async () => {
    prisma = createScriptDatabaseClient();

    await prisma.user.create({
      data: {
        id: staffId,
        email,
        name: "Database Test Staff",
        passwordHash: "not-a-real-password-hash",
        role: "STAFF",
      },
    });

    await prisma.service.create({
      data: {
        id: serviceId,
        name: "Database Test Service",
        slug: `database-test-${runId}`,
        description: "Synthetic integration-test service.",
        durationMinutes: 60,
        priceCents: 10_000,
        currency: "USD",
        isActive: true,
        isPublished: false,
      },
    });
  });

  afterAll(async () => {
    await prisma.booking.deleteMany({ where: { staffId } });
    await prisma.staffService.deleteMany({ where: { staffId } });
    await prisma.service.deleteMany({ where: { id: serviceId } });
    await prisma.user.deleteMany({ where: { id: staffId } });
    await prisma.$disconnect();
  });

  function createBooking(
    reference: string,
    status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED",
    startAt: string,
    endAt: string,
  ) {
    return prisma.booking.create({
      data: {
        publicReference: reference,
        status,
        serviceId,
        staffId,
        customerName: "Database Test Customer",
        customerEmail: "database-test-customer@example.test",
        customerPhone: "+15550100000",
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        timezoneSnapshot: "America/New_York",
        serviceNameSnapshot: "Database Test Service",
        serviceDurationSnapshot: 60,
        priceCentsSnapshot: 10_000,
        currencySnapshot: "USD",
      },
    });
  }

  it("enforces StaffService composite uniqueness", async () => {
    await prisma.staffService.create({ data: { staffId, serviceId } });

    await expect(
      prisma.staffService.create({ data: { staffId, serviceId } }),
    ).rejects.toThrow();
  });

  it("allows adjacent half open active bookings", async () => {
    await createBooking(
      `ADJ-A-${runId}`.slice(0, 32),
      "PENDING",
      "2035-01-02T14:00:00.000Z",
      "2035-01-02T15:00:00.000Z",
    );

    await expect(
      createBooking(
        `ADJ-B-${runId}`.slice(0, 32),
        "CONFIRMED",
        "2035-01-02T15:00:00.000Z",
        "2035-01-02T16:00:00.000Z",
      ),
    ).resolves.toBeDefined();
  });

  it("rejects overlapping PENDING and CONFIRMED bookings", async () => {
    await createBooking(
      `OVR-A-${runId}`.slice(0, 32),
      "PENDING",
      "2035-01-02T17:00:00.000Z",
      "2035-01-02T18:00:00.000Z",
    );

    await expect(
      createBooking(
        `OVR-B-${runId}`.slice(0, 32),
        "CONFIRMED",
        "2035-01-02T17:30:00.000Z",
        "2035-01-02T18:30:00.000Z",
      ),
    ).rejects.toThrow();
  });

  it.each([
    ["COMPLETED", "20:00:00", "21:00:00"],
    ["CANCELLED", "22:00:00", "23:00:00"],
  ] as const)(
    "allows a PENDING replacement over a %s booking",
    async (status, startTime, endTime) => {
      const marker = status.slice(0, 3);
      await createBooking(
        `${marker}-OLD-${runId}`.slice(0, 32),
        status,
        `2035-01-02T${startTime}.000Z`,
        `2035-01-02T${endTime}.000Z`,
      );

      await expect(
        createBooking(
          `${marker}-NEW-${runId}`.slice(0, 32),
          "PENDING",
          `2035-01-02T${startTime}.000Z`,
          `2035-01-02T${endTime}.000Z`,
        ),
      ).resolves.toBeDefined();
    },
  );
});

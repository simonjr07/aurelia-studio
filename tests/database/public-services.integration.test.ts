import "dotenv/config";

import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createScriptDatabaseClient } from "../../scripts/database-client";
import { createPublicServiceQueries } from "../../src/server/services/public-service-queries";

const hasDatabaseUrl = Boolean(
  process.env.DIRECT_URL ?? process.env.DATABASE_URL,
);

describe.skipIf(!hasDatabaseUrl)("public service queries", () => {
  let prisma: ReturnType<typeof createScriptDatabaseClient>;
  const runId = randomUUID();
  const slugPrefix = `public-query-${runId}`;
  const ids = {
    alpha: randomUUID(),
    zulu: randomUUID(),
    unpublished: randomUUID(),
    inactive: randomUUID(),
    activeStaff: randomUUID(),
    activeAdmin: randomUUID(),
    disabledStaff: randomUUID(),
    unrelatedStaff: randomUUID(),
  };

  beforeAll(async () => {
    prisma = createScriptDatabaseClient();

    await prisma.user.createMany({
      data: [
        {
          id: ids.activeStaff,
          email: `active-staff-${runId}@example.test`,
          name: "Aster Staff",
          passwordHash: "integration-test-only",
          role: "STAFF",
          status: "ACTIVE",
        },
        {
          id: ids.activeAdmin,
          email: `active-admin-${runId}@example.test`,
          name: "Bea Admin",
          passwordHash: "integration-test-only",
          role: "ADMIN",
          status: "ACTIVE",
        },
        {
          id: ids.disabledStaff,
          email: `disabled-staff-${runId}@example.test`,
          name: "Disabled Staff",
          passwordHash: "integration-test-only",
          role: "STAFF",
          status: "DISABLED",
        },
        {
          id: ids.unrelatedStaff,
          email: `unrelated-staff-${runId}@example.test`,
          name: "Unrelated Staff",
          passwordHash: "integration-test-only",
          role: "STAFF",
          status: "ACTIVE",
        },
      ],
    });

    await prisma.service.createMany({
      data: [
        {
          id: ids.zulu,
          name: "Zulu Treatment",
          slug: `${slugPrefix}-zulu`,
          description: "Published and active.",
          durationMinutes: 60,
          priceCents: 10_000,
          currency: "USD",
          isPublished: true,
          isActive: true,
        },
        {
          id: ids.alpha,
          name: "Alpha Treatment",
          slug: `${slugPrefix}-alpha`,
          description: "Published and active.",
          durationMinutes: 30,
          priceCents: 5_000,
          currency: "USD",
          isPublished: true,
          isActive: true,
        },
        {
          id: ids.unpublished,
          name: "Hidden Treatment",
          slug: `${slugPrefix}-unpublished`,
          description: "Unpublished.",
          durationMinutes: 45,
          priceCents: 7_000,
          currency: "USD",
          isPublished: false,
          isActive: true,
        },
        {
          id: ids.inactive,
          name: "Inactive Treatment",
          slug: `${slugPrefix}-inactive`,
          description: "Inactive.",
          durationMinutes: 45,
          priceCents: 7_000,
          currency: "USD",
          isPublished: true,
          isActive: false,
        },
      ],
    });

    await prisma.staffService.createMany({
      data: [
        { staffId: ids.activeStaff, serviceId: ids.alpha },
        { staffId: ids.activeAdmin, serviceId: ids.alpha },
        { staffId: ids.disabledStaff, serviceId: ids.alpha },
        { staffId: ids.unrelatedStaff, serviceId: ids.zulu },
      ],
    });
  });

  afterAll(async () => {
    await prisma.staffService.deleteMany({
      where: {
        OR: [
          { serviceId: { in: [ids.alpha, ids.zulu] } },
          {
            staffId: {
              in: [
                ids.activeStaff,
                ids.activeAdmin,
                ids.disabledStaff,
                ids.unrelatedStaff,
              ],
            },
          },
        ],
      },
    });
    await prisma.service.deleteMany({
      where: {
        id: { in: [ids.alpha, ids.zulu, ids.unpublished, ids.inactive] },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [
            ids.activeStaff,
            ids.activeAdmin,
            ids.disabledStaff,
            ids.unrelatedStaff,
          ],
        },
      },
    });
    await prisma.$disconnect();
  });

  it("returns only published active services in deterministic order", async () => {
    const services = await createPublicServiceQueries(prisma).getPublicServices();
    const matching = services.filter((service) =>
      service.slug.startsWith(slugPrefix),
    );

    expect(matching.map(({ name }) => name)).toEqual([
      "Alpha Treatment",
      "Zulu Treatment",
    ]);
    expect(matching.map(({ slug }) => slug)).not.toContain(
      `${slugPrefix}-unpublished`,
    );
    expect(matching.map(({ slug }) => slug)).not.toContain(
      `${slugPrefix}-inactive`,
    );
  });

  it("treats unpublished and inactive slugs as unavailable", async () => {
    const queries = createPublicServiceQueries(prisma);

    await expect(
      queries.getPublicServiceBySlug(`${slugPrefix}-unpublished`),
    ).resolves.toBeNull();
    await expect(
      queries.getPublicServiceBySlug(`${slugPrefix}-inactive`),
    ).resolves.toBeNull();
  });

  it("returns only active, assigned staff using public-safe fields", async () => {
    const service = await createPublicServiceQueries(
      prisma,
    ).getPublicServiceBySlug(`${slugPrefix}-alpha`);

    expect(service?.eligibleStaff).toEqual([
      { id: ids.activeStaff, name: "Aster Staff" },
      { id: ids.activeAdmin, name: "Bea Admin" },
    ]);
    expect(service?.eligibleStaff).not.toContainEqual(
      expect.objectContaining({ id: ids.disabledStaff }),
    );
    expect(service?.eligibleStaff).not.toContainEqual(
      expect.objectContaining({ id: ids.unrelatedStaff }),
    );
    expect(Object.keys(service?.eligibleStaff[0] ?? {}).sort()).toEqual([
      "id",
      "name",
    ]);
  });
});

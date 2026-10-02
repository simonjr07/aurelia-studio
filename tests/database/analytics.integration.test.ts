import "dotenv/config";

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createScriptDatabaseClient } from "../../scripts/database-client";
import { AuthorizationError } from "../../src/server/auth/authorization-policy";
import type { CurrentUser } from "../../src/server/auth/current-user-service";
import { getDashboardAnalytics } from "../../src/server/analytics/dashboard-analytics";

const hasDatabaseUrl = Boolean(process.env.DIRECT_URL ?? process.env.DATABASE_URL);

describe.skipIf(!hasDatabaseUrl)("dashboard analytics", () => {
  const prisma = createScriptDatabaseClient();
  const runId = randomUUID();
  const ids = {
    admin: randomUUID(),
    activeStaff: randomUUID(),
    disabledStaff: randomUUID(),
    alphaService: randomUUID(),
    betaService: randomUUID(),
    legacyService: randomUUID(),
  };
  const admin: CurrentUser = { id: ids.admin, name: "Analytics Admin", email: `analytics-admin-${runId}@example.test`, role: "ADMIN" };
  const staffActor: CurrentUser = { id: ids.activeStaff, name: "Active Analyst", email: `analytics-active-${runId}@example.test`, role: "STAFF" };
  let referenceCounter = 0;

  function booking(input: {
    status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
    serviceId: string;
    staffId: string;
    startAt: string;
    duration: number;
    serviceName: string;
  }) {
    const startAt = new Date(input.startAt);
    referenceCounter += 1;
    return {
      publicReference: `AUR-${runId.replaceAll("-", "").slice(0, 12)}${referenceCounter.toString().padStart(4, "0")}`,
      status: input.status,
      serviceId: input.serviceId,
      staffId: input.staffId,
      customerName: `Private Guest ${referenceCounter}`,
      customerEmail: `private-${referenceCounter}-${runId}@example.test`,
      customerPhone: "+1 555 010 9999",
      customerNote: "Never expose this analytics fixture note.",
      startAt,
      endAt: new Date(startAt.getTime() + input.duration * 60_000),
      timezoneSnapshot: "America/New_York",
      serviceNameSnapshot: input.serviceName,
      serviceDurationSnapshot: input.duration,
      priceCentsSnapshot: 10_000,
      currencySnapshot: "USD",
    };
  }

  beforeAll(async () => {
    await prisma.user.createMany({ data: [
      { id: ids.admin, name: admin.name, email: admin.email, passwordHash: "test", role: "ADMIN", status: "ACTIVE" },
      { id: ids.activeStaff, name: staffActor.name, email: staffActor.email, passwordHash: "test", role: "STAFF", status: "ACTIVE" },
      { id: ids.disabledStaff, name: "Disabled Historical Staff", email: `analytics-disabled-${runId}@example.test`, passwordHash: "test", role: "STAFF", status: "DISABLED" },
    ] });
    await prisma.service.createMany({ data: [
      { id: ids.alphaService, name: "Current Alpha", slug: `analytics-alpha-${runId}`, description: "Analytics fixture", durationMinutes: 30, priceCents: 10_000, currency: "USD", isPublished: true, isActive: true },
      { id: ids.betaService, name: "Current Beta", slug: `analytics-beta-${runId}`, description: "Analytics fixture", durationMinutes: 30, priceCents: 10_000, currency: "USD", isPublished: true, isActive: true },
      { id: ids.legacyService, name: "Retired Legacy", slug: `analytics-legacy-${runId}`, description: "Analytics fixture", durationMinutes: 60, priceCents: 15_000, currency: "USD", isPublished: false, isActive: false },
    ] });
    await prisma.booking.createMany({ data: [
      booking({ status: "PENDING", serviceId: ids.alphaService, staffId: ids.activeStaff, startAt: "2031-04-01T04:30:00.000Z", duration: 30, serviceName: "Alpha Snapshot" }),
      booking({ status: "CONFIRMED", serviceId: ids.legacyService, staffId: ids.disabledStaff, startAt: "2031-04-02T01:00:00.000Z", duration: 60, serviceName: "Legacy Snapshot" }),
      booking({ status: "COMPLETED", serviceId: ids.alphaService, staffId: ids.activeStaff, startAt: "2031-04-02T15:00:00.000Z", duration: 30, serviceName: "Alpha Snapshot" }),
      booking({ status: "CANCELLED", serviceId: ids.legacyService, staffId: ids.disabledStaff, startAt: "2031-04-03T15:00:00.000Z", duration: 60, serviceName: "Legacy Snapshot" }),
      booking({ status: "NO_SHOW", serviceId: ids.betaService, staffId: ids.activeStaff, startAt: "2031-04-03T17:00:00.000Z", duration: 30, serviceName: "Beta Snapshot" }),
      booking({ status: "PENDING", serviceId: ids.alphaService, staffId: ids.activeStaff, startAt: "2031-04-01T03:30:00.000Z", duration: 30, serviceName: "Alpha Snapshot" }),
    ] });
  });

  afterAll(async () => {
    await prisma.booking.deleteMany({ where: { serviceId: { in: [ids.alphaService, ids.betaService, ids.legacyService] } } });
    await prisma.service.deleteMany({ where: { id: { in: [ids.alphaService, ids.betaService, ids.legacyService] } } });
    await prisma.user.deleteMany({ where: { id: { in: [ids.admin, ids.activeStaff, ids.disabledStaff] } } });
    await prisma.$disconnect();
  });

  it("uses studio-local boundaries and returns complete current-status counts", async () => {
    const result = await getDashboardAnalytics(admin, { start: "2031-04-01", end: "2031-04-03" }, new Date("2031-04-04T12:00:00Z"), prisma);
    expect(result.range.startAt.toISOString()).toBe("2031-04-01T04:00:00.000Z");
    expect(result.summary).toEqual({ total: 5, PENDING: 1, CONFIRMED: 1, COMPLETED: 1, CANCELLED: 1, NO_SHOW: 1 });
    expect(result.trend).toEqual([
      { date: "2031-04-01", count: 2 },
      { date: "2031-04-02", count: 1 },
      { date: "2031-04-03", count: 2 },
    ]);
  });

  it("ranks stable services by count using historical snapshot labels", async () => {
    const result = await getDashboardAnalytics(admin, { start: "2031-04-01", end: "2031-04-03" }, new Date(), prisma);
    expect(result.popularServices).toEqual([
      { serviceId: ids.alphaService, serviceName: "Alpha Snapshot", bookingCount: 2, scheduledMinutes: 60 },
      { serviceId: ids.legacyService, serviceName: "Legacy Snapshot", bookingCount: 2, scheduledMinutes: 120 },
      { serviceId: ids.betaService, serviceName: "Beta Snapshot", bookingCount: 1, scheduledMinutes: 30 },
    ]);
  });

  it("includes disabled staff history and excludes cancelled time from workload", async () => {
    const result = await getDashboardAnalytics(admin, { start: "2031-04-01", end: "2031-04-03" }, new Date(), prisma);
    expect(result.staffWorkload).toEqual([
      { staffId: ids.activeStaff, staffName: "Active Analyst", appointmentCount: 3, scheduledMinutes: 90 },
      { staffId: ids.disabledStaff, staffName: "Disabled Historical Staff", appointmentCount: 1, scheduledMinutes: 60 },
    ]);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("Private Guest");
    expect(serialized).not.toContain("private-");
    expect(serialized).not.toContain("Never expose");
    expect(serialized).not.toContain("AUR-");
  });

  it("rejects staff before running analytics queries", async () => {
    await expect(getDashboardAnalytics(staffActor, { range: "30d" }, new Date(), prisma)).rejects.toBeInstanceOf(AuthorizationError);
  });
});

import "dotenv/config";

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createScriptDatabaseClient } from "../../scripts/database-client";
import type { CurrentUser } from "../../src/server/auth/current-user-service";
import { getServiceAvailabilityWithDatabase } from "../../src/server/availability/availability-service";
import {
  createAvailabilityRule, createBlockedTime, deleteAvailabilityRule, deleteBlockedTime,
  DisabledStaffScheduleError, getScheduleForActor, ScheduleConflictError, ScheduleNotFoundError,
} from "../../src/server/schedule/schedule-service";

const hasDatabaseUrl = Boolean(process.env.DIRECT_URL ?? process.env.DATABASE_URL);

describe.skipIf(!hasDatabaseUrl)("schedule management", () => {
  const prisma = createScriptDatabaseClient();
  const runId = randomUUID();
  const ids = { admin: randomUUID(), staffA: randomUUID(), staffB: randomUUID(), disabled: randomUUID(), service: randomUUID() };
  const admin: CurrentUser = { id: ids.admin, name: "Schedule Admin", email: `schedule-admin-${runId}@example.test`, role: "ADMIN" };
  const staffA: CurrentUser = { id: ids.staffA, name: "Schedule Staff A", email: `schedule-a-${runId}@example.test`, role: "STAFF" };
  const staffB: CurrentUser = { id: ids.staffB, name: "Schedule Staff B", email: `schedule-b-${runId}@example.test`, role: "STAFF" };

  beforeAll(async () => {
    await prisma.user.createMany({ data: [
      { id: ids.admin, name: admin.name, email: admin.email, passwordHash: "test", role: "ADMIN", status: "ACTIVE" },
      { id: ids.staffA, name: staffA.name, email: staffA.email, passwordHash: "test", role: "STAFF", status: "ACTIVE" },
      { id: ids.staffB, name: staffB.name, email: staffB.email, passwordHash: "test", role: "STAFF", status: "ACTIVE" },
      { id: ids.disabled, name: "Disabled Schedule Staff", email: `schedule-disabled-${runId}@example.test`, passwordHash: "test", role: "STAFF", status: "DISABLED" },
    ] });
    await prisma.service.create({ data: { id: ids.service, name: "Schedule Test Service", slug: `schedule-${runId}`, description: "Schedule integration service.", durationMinutes: 60, priceCents: 10000, currency: "USD", isPublished: true, isActive: true } });
    await prisma.staffService.create({ data: { staffId: ids.staffA, serviceId: ids.service } });
  });

  afterAll(async () => {
    await prisma.booking.deleteMany({ where: { serviceId: ids.service } });
    await prisma.blockedTime.deleteMany({ where: { staffId: { in: [ids.staffA, ids.staffB, ids.disabled] } } });
    await prisma.availabilityRule.deleteMany({ where: { staffId: { in: [ids.staffA, ids.staffB, ids.disabled] } } });
    await prisma.service.deleteMany({ where: { id: ids.service } });
    await prisma.user.deleteMany({ where: { id: { in: [ids.admin, ids.staffA, ids.staffB, ids.disabled] } } });
    await prisma.$disconnect();
  });

  it("enforces recurring-rule scope, overlap, touching, duplicates, and deletion", async () => {
    const first = await createAvailabilityRule(admin, { staffId: ids.staffA, weekday: "TUESDAY", startTime: "09:00", endTime: "12:00" }, prisma);
    const touching = await createAvailabilityRule(staffA, { staffId: ids.staffA, weekday: "TUESDAY", startTime: "12:00", endTime: "15:00" }, prisma);
    await expect(createAvailabilityRule(staffA, { staffId: ids.staffB, weekday: "TUESDAY", startTime: "09:00", endTime: "10:00" }, prisma)).rejects.toBeInstanceOf(ScheduleNotFoundError);
    await expect(createAvailabilityRule(staffA, { staffId: ids.staffA, weekday: "TUESDAY", startTime: "11:00", endTime: "13:00" }, prisma)).rejects.toBeInstanceOf(ScheduleConflictError);
    await expect(createAvailabilityRule(admin, { staffId: ids.staffA, weekday: "TUESDAY", startTime: "09:00", endTime: "12:00" }, prisma)).rejects.toBeInstanceOf(ScheduleConflictError);
    await expect(deleteAvailabilityRule(staffB, first.id, prisma)).rejects.toBeInstanceOf(ScheduleNotFoundError);
    await expect(deleteAvailabilityRule(staffA, touching.id, prisma)).resolves.toEqual({ id: touching.id });
    await deleteAvailabilityRule(admin, first.id, prisma);
  });

  it("converts, scopes, removes overlaps, touches, and deletes blocked time", async () => {
    const first = await createBlockedTime(admin, { staffId: ids.staffA, date: "2026-10-13", startTime: "09:00", endTime: "10:00", reason: "Private internal reason" }, prisma);
    const stored = await prisma.blockedTime.findUniqueOrThrow({ where: { id: first.id } });
    expect(stored.startAt.toISOString()).toBe("2026-10-13T13:00:00.000Z");
    const touching = await createBlockedTime(staffA, { staffId: ids.staffA, date: "2026-10-13", startTime: "10:00", endTime: "11:00" }, prisma);
    await expect(createBlockedTime(staffA, { staffId: ids.staffA, date: "2026-10-13", startTime: "09:30", endTime: "10:30" }, prisma)).rejects.toBeInstanceOf(ScheduleConflictError);
    await expect(createBlockedTime(staffA, { staffId: ids.staffB, date: "2026-10-13", startTime: "12:00", endTime: "13:00" }, prisma)).rejects.toBeInstanceOf(ScheduleNotFoundError);
    await expect(deleteBlockedTime(staffB, first.id, prisma)).rejects.toBeInstanceOf(ScheduleNotFoundError);
    await deleteBlockedTime(staffA, touching.id, prisma);
    await deleteBlockedTime(admin, first.id, prisma);
  });

  it("rejects active-booking conflicts and permits terminal-history overlaps without mutation", async () => {
    const statuses = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;
    for (const [index, status] of statuses.entries()) {
      const day = 14 + index;
      const date = `2026-10-${day}`;
      const booking = await prisma.booking.create({ data: { publicReference: `AUR-${status}-${runId.slice(0, 8)}`, status, serviceId: ids.service, staffId: ids.staffA, customerName: "Schedule Customer", customerEmail: "schedule@example.test", customerPhone: "+1 555 010 7000", startAt: new Date(`2026-10-${day}T13:00:00Z`), endAt: new Date(`2026-10-${day}T14:00:00Z`), timezoneSnapshot: "America/New_York", serviceNameSnapshot: "Historic Service", serviceDurationSnapshot: 60, priceCentsSnapshot: 10000, currencySnapshot: "USD" } });
      if (status === "PENDING" || status === "CONFIRMED") {
        await expect(createBlockedTime(admin, { staffId: ids.staffA, date, startTime: "09:30", endTime: "10:30" }, prisma)).rejects.toThrow("Blocked time overlaps an existing appointment.");
      } else {
        const block = await createBlockedTime(admin, { staffId: ids.staffA, date, startTime: "09:30", endTime: "10:30" }, prisma);
        await deleteBlockedTime(admin, block.id, prisma);
      }
      expect((await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe(status);
    }
  });

  it("feeds rule and block changes directly into public availability", async () => {
    const input = { serviceSlug: `schedule-${runId}`, date: "2026-10-12", now: new Date("2026-10-01T12:00:00Z") };
    const rule = await createAvailabilityRule(staffA, { staffId: ids.staffA, weekday: "MONDAY", startTime: "09:00", endTime: "12:00" }, prisma);
    const withRule = await getServiceAvailabilityWithDatabase(prisma, input);
    expect(withRule.slots.length).toBeGreaterThan(0);
    await deleteAvailabilityRule(staffA, rule.id, prisma);
    expect((await getServiceAvailabilityWithDatabase(prisma, input)).slots).toEqual([]);
    const restoredRule = await createAvailabilityRule(staffA, { staffId: ids.staffA, weekday: "MONDAY", startTime: "09:00", endTime: "12:00" }, prisma);
    const block = await createBlockedTime(staffA, { staffId: ids.staffA, date: "2026-10-12", startTime: "09:00", endTime: "10:00" }, prisma);
    const blocked = await getServiceAvailabilityWithDatabase(prisma, input);
    expect(blocked.slots.some((slot) => slot.localTimeLabel === "9:00 AM")).toBe(false);
    await deleteBlockedTime(staffA, block.id, prisma);
    expect((await getServiceAvailabilityWithDatabase(prisma, input)).slots.some((slot) => slot.localTimeLabel === "9:00 AM")).toBe(true);
    await deleteAvailabilityRule(staffA, restoredRule.id, prisma);
  });

  it("allows admin inspection but prevents new entries for disabled staff", async () => {
    const existing = await prisma.availabilityRule.create({ data: { staffId: ids.disabled, weekday: "FRIDAY", startLocalMinutes: 600, endLocalMinutes: 660 } });
    const inspected = await getScheduleForActor(admin, ids.disabled, prisma);
    expect(inspected?.staff.status).toBe("DISABLED");
    expect(inspected?.rules.map((rule) => rule.id)).toContain(existing.id);
    await expect(createAvailabilityRule(admin, { staffId: ids.disabled, weekday: "MONDAY", startTime: "09:00", endTime: "10:00" }, prisma)).rejects.toBeInstanceOf(DisabledStaffScheduleError);
    await expect(createBlockedTime(admin, { staffId: ids.disabled, date: "2026-10-20", startTime: "09:00", endTime: "10:00" }, prisma)).rejects.toBeInstanceOf(DisabledStaffScheduleError);
    expect(await prisma.availabilityRule.count({ where: { staffId: ids.disabled } })).toBe(1);
    await expect(getScheduleForActor(staffA, ids.staffB, prisma)).resolves.toBeNull();
  });
});


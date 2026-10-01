import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

import { createScriptDatabaseClient } from "../../scripts/database-client";
import type { BookingStatus } from "../../src/generated/prisma/enums";
import type { CurrentUser } from "../../src/server/auth/current-user-service";
import { getServiceAvailabilityWithDatabase } from "../../src/server/availability/availability-service";
import { BookingChangeConflictError, BookingChangeNotFoundError, BookingPolicyError, BookingVerificationError, cancelPublicBooking, rescheduleInternalBooking, reschedulePublicBooking } from "../../src/server/bookings/change-booking";

const hasDatabaseUrl = Boolean(process.env.DIRECT_URL ?? process.env.DATABASE_URL);
describe.skipIf(!hasDatabaseUrl)("booking cancellation and rescheduling", () => {
  const prisma = createScriptDatabaseClient(); const runId = randomUUID();
  const ids = { admin: randomUUID(), staffA: randomUUID(), staffB: randomUUID(), service: randomUUID() };
  const admin: CurrentUser = { id: ids.admin, name: "Change Admin", email: `change-admin-${runId}@example.test`, role: "ADMIN" };
  const staffA: CurrentUser = { id: ids.staffA, name: "Change Staff A", email: `change-a-${runId}@example.test`, role: "STAFF" };
  const staffB: CurrentUser = { id: ids.staffB, name: "Change Staff B", email: `change-b-${runId}@example.test`, role: "STAFF" };
  let counter = 0;
  const reference = () => `AUR-${(++counter).toString().padStart(16, "0")}`;
  async function booking(status: BookingStatus, day: number, hour = 13, staffId = ids.staffA) {
    const ref = reference(); const startAt = new Date(`2026-10-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00Z`);
    return prisma.booking.create({ data: { publicReference: ref, status, serviceId: ids.service, staffId, customerName: "Change Guest", customerEmail: `${ref.toLowerCase()}@example.test`, customerPhone: "+1 555 010 1100", customerNote: "Preserve me", startAt, endAt: new Date(startAt.getTime() + 60 * 60_000), timezoneSnapshot: "America/New_York", serviceNameSnapshot: "Historic Change Service", serviceDurationSnapshot: 60, priceCentsSnapshot: 12345, currencySnapshot: "USD" } });
  }
  const credentials = (item: { publicReference: string; customerEmail: string; status: BookingStatus; startAt: Date }) => ({ reference: item.publicReference, email: item.customerEmail, expectedStatus: item.status as "PENDING" | "CONFIRMED", expectedStartAt: item.startAt.toISOString() });

  beforeAll(async () => {
    await prisma.user.createMany({ data: [
      { id: ids.admin, name: admin.name, email: admin.email, passwordHash: "test", role: "ADMIN", status: "ACTIVE" },
      { id: ids.staffA, name: staffA.name, email: staffA.email, passwordHash: "test", role: "STAFF", status: "ACTIVE" },
      { id: ids.staffB, name: staffB.name, email: staffB.email, passwordHash: "test", role: "STAFF", status: "ACTIVE" },
    ] });
    await prisma.service.create({ data: { id: ids.service, name: "Change Service", slug: `change-${runId}`, description: "Change test.", durationMinutes: 60, priceCents: 9999, currency: "USD", isPublished: true, isActive: true } });
    await prisma.staffService.createMany({ data: [{ staffId: ids.staffA, serviceId: ids.service }, { staffId: ids.staffB, serviceId: ids.service }] });
    await prisma.availabilityRule.createMany({ data: [ids.staffA, ids.staffB].flatMap((staffId) => ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"].map((weekday) => ({ staffId, weekday: weekday as "MONDAY", startLocalMinutes: 540, endLocalMinutes: 1020 }))) });
  });
  afterAll(async () => { await prisma.booking.deleteMany({ where: { serviceId: ids.service } }); await prisma.service.delete({ where: { id: ids.service } }); await prisma.user.deleteMany({ where: { id: { in: [ids.admin, ids.staffA, ids.staffB] } } }); await prisma.$disconnect(); });

  it("cancels PENDING and CONFIRMED at/before cutoff with a public audit actor", async () => {
    for (const status of ["PENDING", "CONFIRMED"] as const) {
      const item = await booking(status, status === "PENDING" ? 12 : 13);
      const result = await cancelPublicBooking(credentials(item), new Date(item.startAt.getTime() - 120 * 60_000), prisma);
      expect(result.status).toBe("CANCELLED");
      expect(await prisma.bookingStatusEvent.findFirst({ where: { bookingId: item.id } })).toMatchObject({ fromStatus: status, toStatus: "CANCELLED", changedByUserId: null });
    }
  });

  it("rejects terminal, inside-cutoff, wrong-email, and unknown-reference cancellation safely", async () => {
    for (const status of ["COMPLETED", "CANCELLED", "NO_SHOW"] as const) { const item = await booking(status, 14 + ["COMPLETED", "CANCELLED", "NO_SHOW"].indexOf(status)); await expect(cancelPublicBooking({ ...credentials(item), expectedStatus: "PENDING" }, new Date("2026-10-01"), prisma)).rejects.toBeInstanceOf(BookingChangeConflictError); }
    const item = await booking("PENDING", 19);
    await expect(cancelPublicBooking(credentials(item), new Date(item.startAt.getTime() - 119 * 60_000), prisma)).rejects.toBeInstanceOf(BookingPolicyError);
    await expect(cancelPublicBooking({ ...credentials(item), email: "wrong@example.test" }, new Date("2026-10-01"), prisma)).rejects.toBeInstanceOf(BookingVerificationError);
    await expect(cancelPublicBooking({ ...credentials(item), reference: "AUR-9999999999999999" }, new Date("2026-10-01"), prisma)).rejects.toBeInstanceOf(BookingVerificationError);
  });

  it("reschedules the same booking, preserves status/reference/snapshots, and records public audit", async () => {
    const item = await booking("CONFIRMED", 20, 13); const target = "2026-10-20T16:00:00.000Z";
    const result = await reschedulePublicBooking({ ...credentials(item), startAt: target }, new Date(item.startAt.getTime() - 240 * 60_000), prisma);
    const stored = await prisma.booking.findUniqueOrThrow({ where: { id: item.id }, include: { rescheduleEvents: true } });
    expect(result.status).toBe("CONFIRMED"); expect(stored.id).toBe(item.id); expect(stored.publicReference).toBe(item.publicReference); expect(stored.startAt.toISOString()).toBe(target);
    expect(stored).toMatchObject({ serviceNameSnapshot: "Historic Change Service", serviceDurationSnapshot: 60, priceCentsSnapshot: 12345, currencySnapshot: "USD", customerNote: "Preserve me" });
    expect(stored.rescheduleEvents).toHaveLength(1); expect(stored.rescheduleEvents[0].changedByUserId).toBeNull();
  });

  it("releases capacity after cancellation and moves it after reschedule", async () => {
    const cancelItem = await booking("PENDING", 21, 13); const input = { serviceSlug: `change-${runId}`, date: "2026-10-21", now: new Date("2026-10-01T12:00:00Z"), staffId: ids.staffA };
    expect((await getServiceAvailabilityWithDatabase(prisma, input)).slots.some((slot) => slot.startAt === cancelItem.startAt.toISOString())).toBe(false);
    await cancelPublicBooking(credentials(cancelItem), new Date("2026-10-01T12:00:00Z"), prisma);
    expect((await getServiceAvailabilityWithDatabase(prisma, input)).slots.some((slot) => slot.startAt === cancelItem.startAt.toISOString())).toBe(true);
    const move = await booking("PENDING", 22, 13); const target = "2026-10-22T16:00:00.000Z";
    await reschedulePublicBooking({ ...credentials(move), startAt: target, staffId: ids.staffA }, new Date("2026-10-01T12:00:00Z"), prisma);
    const slots = (await getServiceAvailabilityWithDatabase(prisma, { ...input, date: "2026-10-22" })).slots;
    expect(slots.some((slot) => slot.startAt === move.startAt.toISOString())).toBe(true); expect(slots.some((slot) => slot.startAt === target)).toBe(false);
  });

  it("enforces reschedule cutoff/state and supports deterministic Any available", async () => {
    const exact = await booking("PENDING", 23, 13); await expect(reschedulePublicBooking({ ...credentials(exact), startAt: "2026-10-23T16:00:00.000Z" }, new Date(exact.startAt.getTime() - 240 * 60_000), prisma)).resolves.toBeTruthy();
    const inside = await booking("PENDING", 26, 13); await expect(reschedulePublicBooking({ ...credentials(inside), startAt: "2026-10-26T16:00:00.000Z" }, new Date(inside.startAt.getTime() - 239 * 60_000), prisma)).rejects.toBeInstanceOf(BookingPolicyError);
    await expect(reschedulePublicBooking({ ...credentials(inside), email: "wrong@example.test", startAt: "2026-10-26T16:00:00.000Z" }, new Date("2026-10-01"), prisma)).rejects.toBeInstanceOf(BookingVerificationError);
    const terminal = await booking("COMPLETED", 27, 13); await expect(reschedulePublicBooking({ ...credentials(terminal), expectedStatus: "PENDING", startAt: "2026-10-27T16:00:00.000Z" }, new Date("2026-10-01"), prisma)).rejects.toBeInstanceOf(BookingChangeConflictError);
  });

  it("enforces internal STAFF scope/self-only target while ADMIN can select eligible staff", async () => {
    const own = await booking("PENDING", 28, 13, ids.staffA);
    await expect(rescheduleInternalBooking(staffB, own.id, { expectedStatus: "PENDING", expectedStartAt: own.startAt.toISOString(), startAt: "2026-10-28T16:00:00.000Z" }, new Date("2026-10-01"), prisma)).rejects.toBeInstanceOf(BookingChangeNotFoundError);
    await expect(rescheduleInternalBooking(staffA, own.id, { expectedStatus: "PENDING", expectedStartAt: own.startAt.toISOString(), startAt: "2026-10-28T16:00:00.000Z", staffId: ids.staffB }, new Date("2026-10-01"), prisma)).resolves.toMatchObject({ staffId: ids.staffA });
    const adminItem = await booking("PENDING", 29, 13, ids.staffA);
    await expect(rescheduleInternalBooking(admin, adminItem.id, { expectedStatus: "PENDING", expectedStartAt: adminItem.startAt.toISOString(), startAt: "2026-10-29T16:00:00.000Z", staffId: ids.staffB, note: "Operational move" }, new Date("2026-10-01"), prisma)).resolves.toMatchObject({ staffId: ids.staffB });
  });

  it("keeps concurrent reschedule and cancel races coherent", async () => {
    const first = await booking("PENDING", 30, 13); const second = await booking("PENDING", 30, 14, ids.staffB); const target = "2026-10-30T16:00:00.000Z";
    const competing = await Promise.allSettled([reschedulePublicBooking({ ...credentials(first), startAt: target, staffId: ids.staffA }, new Date("2026-10-01"), prisma), reschedulePublicBooking({ ...credentials(second), startAt: target, staffId: ids.staffA }, new Date("2026-10-01"), prisma)]);
    expect(competing.filter((result) => result.status === "fulfilled")).toHaveLength(1); expect(competing.filter((result) => result.status === "rejected")).toHaveLength(1);
    const race = await booking("PENDING", 31, 13);
    const outcomes = await Promise.allSettled([cancelPublicBooking(credentials(race), new Date("2026-10-01"), prisma), reschedulePublicBooking({ ...credentials(race), startAt: "2026-10-31T16:00:00.000Z", staffId: ids.staffA }, new Date("2026-10-01"), prisma)]);
    expect(outcomes.filter((result) => result.status === "fulfilled")).toHaveLength(1); expect(outcomes.filter((result) => result.status === "rejected")).toHaveLength(1);
  });
});


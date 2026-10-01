import "dotenv/config";

import { randomUUID } from "node:crypto";
import { compare } from "bcrypt";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { CurrentUser } from "../../src/server/auth/current-user-service";
import { authenticateCredentials } from "../../src/server/auth/credentials";
import { AuthorizationError } from "../../src/server/auth/authorization-policy";
import {
  createService, createStaff, ManagementConflictError, updateService, updateStaff,
  updateStaffServiceAssignments,
} from "../../src/server/management/management-service";
import { createPublicServiceQueries } from "../../src/server/services/public-service-queries";
import { getServiceAvailabilityWithDatabase } from "../../src/server/availability/availability-service";
import { createScriptDatabaseClient } from "../../scripts/database-client";

const hasDatabaseUrl = Boolean(process.env.DIRECT_URL ?? process.env.DATABASE_URL);

describe.skipIf(!hasDatabaseUrl)("service and staff management", () => {
  const prisma = createScriptDatabaseClient();
  const runId = randomUUID();
  const adminId = randomUUID();
  const actor: CurrentUser = { id: adminId, name: "Management Admin", email: `mgmt-admin-${runId}@example.test`, role: "ADMIN" };
  const staffActor: CurrentUser = { id: randomUUID(), name: "Existing Staff", email: `existing-${runId}@example.test`, role: "STAFF" };
  const serviceIds: string[] = [];
  const staffIds: string[] = [];
  const bookingIds: string[] = [];

  beforeAll(async () => {
    await prisma.user.createMany({ data: [
      { id: actor.id, name: actor.name, email: actor.email, passwordHash: "test", role: "ADMIN", status: "ACTIVE" },
      { id: staffActor.id, name: staffActor.name, email: staffActor.email, passwordHash: "test", role: "STAFF", status: "ACTIVE" },
    ] });
    staffIds.push(staffActor.id);
  });

  afterAll(async () => {
    await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
    await prisma.staffService.deleteMany({ where: { OR: [{ staffId: { in: staffIds } }, { serviceId: { in: serviceIds } }] } });
    await prisma.service.deleteMany({ where: { id: { in: serviceIds } } });
    await prisma.user.deleteMany({ where: { id: { in: [actor.id, ...staffIds] } } });
    await prisma.$disconnect();
  });

  it("lets ADMIN create/edit visibility while STAFF is denied and slugs stay unique", async () => {
    await expect(createService(staffActor, {}, prisma)).rejects.toBeInstanceOf(AuthorizationError);
    const created = await createService(actor, { name: "Integration Facial", slug: `Integration Facial ${runId}`, description: "A managed service.", durationMinutes: 60, price: "85.00", currency: "usd", isPublished: true, isActive: true }, prisma);
    serviceIds.push(created.id);
    const stored = await prisma.service.findUniqueOrThrow({ where: { id: created.id } });
    expect(stored).toMatchObject({ priceCents: 8500, currency: "USD", isPublished: true, isActive: true });
    expect((await createPublicServiceQueries(prisma).getPublicServices()).some((item) => item.id === created.id)).toBe(true);

    await expect(createService(actor, { name: "Duplicate", slug: stored.slug, description: "Duplicate", durationMinutes: 30, price: "10", currency: "USD", isPublished: false, isActive: true }, prisma)).rejects.toBeInstanceOf(ManagementConflictError);
    await updateService(actor, created.id, { name: "Edited Integration Facial", slug: stored.slug, description: "Edited safely.", durationMinutes: 90, price: "99.99", currency: "USD", isPublished: false, isActive: true }, prisma);
    expect(await createPublicServiceQueries(prisma).getPublicServiceBySlug(stored.slug)).toBeNull();
    await updateService(actor, created.id, { name: "Edited Integration Facial", slug: stored.slug, description: "Edited safely.", durationMinutes: 90, price: "99.99", currency: "USD", isPublished: true, isActive: false }, prisma);
    expect(await createPublicServiceQueries(prisma).getPublicServiceBySlug(stored.slug)).toBeNull();
    await updateService(actor, created.id, { name: "Edited Integration Facial", slug: stored.slug, description: "Edited safely.", durationMinutes: 90, price: "99.99", currency: "USD", isPublished: true, isActive: true }, prisma);
  });

  it("creates only normalized, bcrypt-backed ACTIVE STAFF accounts and rejects duplicates", async () => {
    await expect(createStaff(staffActor, {}, prisma)).rejects.toBeInstanceOf(AuthorizationError);
    const email = `  NEW.STAFF-${runId}@EXAMPLE.TEST `;
    const password = "A long temporary password 2026";
    const created = await createStaff(actor, { name: "New Professional", email, password }, prisma);
    staffIds.push(created.id);
    expect(created).toMatchObject({ email: email.trim().toLowerCase(), role: "STAFF", status: "ACTIVE" });
    expect(created).not.toHaveProperty("passwordHash");
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: created.id } });
    expect(stored.passwordHash).not.toBe(password);
    expect(await compare(password, stored.passwordHash)).toBe(true);
    await expect(createStaff(actor, { name: "Duplicate", email, password }, prisma)).rejects.toBeInstanceOf(ManagementConflictError);

    const repository = { findByEmail: async (normalizedEmail: string) => prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true, name: true, email: true, role: true, status: true, passwordHash: true } }) };
    await expect(authenticateCredentials({ email, password }, { users: repository })).resolves.toMatchObject({ id: created.id });
    await updateStaff(actor, created.id, { name: "Renamed Professional", status: "DISABLED" }, prisma);
    await expect(authenticateCredentials({ email, password }, { users: repository })).resolves.toBeNull();
    await expect(updateStaff(actor, actor.id, { name: "Unsafe", status: "DISABLED" }, prisma)).rejects.toThrow("Staff account not found.");
    expect((await prisma.user.findUniqueOrThrow({ where: { id: actor.id } })).status).toBe("ACTIVE");
  });

  it("replaces assignments atomically, affects public eligibility, and preserves booking snapshots", async () => {
    const service = await prisma.service.findUniqueOrThrow({ where: { id: serviceIds[0] } });
    const managedStaff = await createStaff(actor, { name: "Assigned Professional", email: `assigned-${runId}@example.test`, password: "Another temporary password 2026" }, prisma);
    staffIds.push(managedStaff.id);
    await expect(updateStaffServiceAssignments(staffActor, managedStaff.id, { serviceIds: [service.id] }, prisma)).rejects.toBeInstanceOf(AuthorizationError);
    await updateStaffServiceAssignments(actor, managedStaff.id, { serviceIds: [service.id] }, prisma);
    expect((await createPublicServiceQueries(prisma).getPublicServiceBySlug(service.slug))?.eligibleStaff.map((item) => item.id)).toContain(managedStaff.id);
    await prisma.availabilityRule.create({ data: { staffId: managedStaff.id, weekday: "MONDAY", startLocalMinutes: 600, endLocalMinutes: 720 } });
    const available = await getServiceAvailabilityWithDatabase(prisma, { serviceSlug: service.slug, date: "2026-10-12", now: new Date("2026-10-01T12:00:00Z") });
    expect(available.slots.some((slot) => slot.eligibleStaff.some((item) => item.id === managedStaff.id))).toBe(true);
    await expect(updateStaffServiceAssignments(actor, managedStaff.id, { serviceIds: [service.id, service.id] }, prisma)).rejects.toBeTruthy();

    const bookingId = randomUUID(); bookingIds.push(bookingId);
    await prisma.booking.create({ data: { id: bookingId, publicReference: `AUR-${runId.replace(/-/g, "").slice(0, 16)}`, serviceId: service.id, staffId: managedStaff.id, customerName: "Snapshot Customer", customerEmail: "snapshot@example.test", customerPhone: "+1 555 010 9000", startAt: new Date("2026-12-10T15:00:00Z"), endAt: new Date("2026-12-10T16:30:00Z"), timezoneSnapshot: "America/New_York", serviceNameSnapshot: "Historic Name", serviceDurationSnapshot: 45, priceCentsSnapshot: 7000, currencySnapshot: "USD" } });
    await updateService(actor, service.id, { name: "Latest Catalogue Name", slug: service.slug, description: service.description, durationMinutes: 120, price: "125.00", currency: "USD", isPublished: true, isActive: true }, prisma);
    await updateStaff(actor, managedStaff.id, { name: "New Live Name", status: "DISABLED" }, prisma);
    expect((await getServiceAvailabilityWithDatabase(prisma, { serviceSlug: service.slug, date: "2026-10-12", now: new Date("2026-10-01T12:00:00Z") })).slots).toEqual([]);
    await updateStaff(actor, managedStaff.id, { name: "New Live Name", status: "ACTIVE" }, prisma);
    await updateStaffServiceAssignments(actor, managedStaff.id, { serviceIds: [] }, prisma);
    const publicDetail = await createPublicServiceQueries(prisma).getPublicServiceBySlug(service.slug);
    expect(publicDetail?.eligibleStaff.map((item) => item.id)).not.toContain(managedStaff.id);
    expect((await getServiceAvailabilityWithDatabase(prisma, { serviceSlug: service.slug, date: "2026-10-12", now: new Date("2026-10-01T12:00:00Z") })).slots).toEqual([]);
    expect(await prisma.booking.findUnique({ where: { id: bookingId }, select: { serviceNameSnapshot: true, serviceDurationSnapshot: true, priceCentsSnapshot: true, staffId: true, staff: { select: { name: true } } } })).toEqual({ serviceNameSnapshot: "Historic Name", serviceDurationSnapshot: 45, priceCentsSnapshot: 7000, staffId: managedStaff.id, staff: { name: "New Live Name" } });
  });
});


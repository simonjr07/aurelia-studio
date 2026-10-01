import "dotenv/config";

import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { CurrentUser } from "../../src/server/auth/current-user-service";
import {
  getAppointment,
  getAppointmentOverview,
  getAppointments,
} from "../../src/server/appointments/appointment-queries";
import {
  AppointmentNotFoundError,
  BookingStatusConflictError,
  updateBookingStatus,
} from "../../src/server/appointments/update-booking-status";
import { createScriptDatabaseClient } from "../../scripts/database-client";

const hasDatabaseUrl = Boolean(process.env.DIRECT_URL ?? process.env.DATABASE_URL);

describe.skipIf(!hasDatabaseUrl)("staff appointment operations", () => {
  const prisma = createScriptDatabaseClient();
  const runId = randomUUID();
  const serviceId = randomUUID();
  const staffAId = randomUUID();
  const staffBId = randomUUID();
  const adminId = randomUUID();
  const bookingIds = {
    staffAToday: randomUUID(),
    staffBToday: randomUUID(),
    staffAUpcoming: randomUUID(),
    mutation: randomUUID(),
    adminMutation: randomUUID(),
    concurrent: randomUUID(),
  };
  const fixedNow = new Date("2026-10-01T12:00:00.000Z");
  const staffA: CurrentUser = {
    id: staffAId,
    name: "Staff Alpha",
    email: `staff-a-${runId}@example.test`,
    role: "STAFF",
  };
  const staffB: CurrentUser = {
    id: staffBId,
    name: "Staff Beta",
    email: `staff-b-${runId}@example.test`,
    role: "STAFF",
  };
  const admin: CurrentUser = {
    id: adminId,
    name: "Admin Operator",
    email: `admin-${runId}@example.test`,
    role: "ADMIN",
  };

  function bookingData(
    id: string,
    suffix: string,
    staffId: string,
    startAt: string,
    status: "PENDING" | "CONFIRMED" = "PENDING",
  ) {
    const start = new Date(startAt);
    return {
      id,
      publicReference: `AUR-${suffix.padEnd(16, "0").slice(0, 16)}`,
      status,
      serviceId,
      staffId,
      customerName: `Customer ${suffix}`,
      customerEmail: `${suffix.toLowerCase()}@example.test`,
      customerPhone: "+1 555 010 8000",
      customerNote: "Operational fixture note.",
      startAt: start,
      endAt: new Date(start.getTime() + 60 * 60_000),
      timezoneSnapshot: "America/New_York",
      serviceNameSnapshot: "Historic Service",
      serviceDurationSnapshot: 60,
      priceCentsSnapshot: 15_000,
      currencySnapshot: "USD",
    };
  }

  beforeAll(async () => {
    await prisma.user.createMany({
      data: [
        { id: staffAId, email: staffA.email, name: staffA.name, passwordHash: "test", role: "STAFF", status: "ACTIVE" },
        { id: staffBId, email: staffB.email, name: staffB.name, passwordHash: "test", role: "STAFF", status: "ACTIVE" },
        { id: adminId, email: admin.email, name: admin.name, passwordHash: "test", role: "ADMIN", status: "ACTIVE" },
      ],
    });
    await prisma.service.create({
      data: { id: serviceId, name: "Live Service", slug: `staff-workflow-${runId}`, description: "Test", durationMinutes: 30, priceCents: 100, currency: "USD", isPublished: true, isActive: true },
    });
    await prisma.booking.createMany({
      data: [
        bookingData(bookingIds.staffAToday, "STAFFATODAY", staffAId, "2026-10-01T13:00:00.000Z", "CONFIRMED"),
        bookingData(bookingIds.staffBToday, "STAFFBTODAY", staffBId, "2026-10-01T14:00:00.000Z"),
        bookingData(bookingIds.staffAUpcoming, "STAFFAUPCOMING", staffAId, "2026-10-02T04:00:00.000Z"),
        bookingData(bookingIds.mutation, "MUTATION", staffAId, "2026-10-03T13:00:00.000Z"),
        bookingData(bookingIds.adminMutation, "ADMINMUTATION", staffBId, "2026-10-03T15:00:00.000Z"),
        bookingData(bookingIds.concurrent, "CONCURRENT", staffAId, "2026-10-04T13:00:00.000Z"),
      ],
    });
    await prisma.bookingStatusEvent.createMany({
      data: [
        { bookingId: bookingIds.staffAToday, fromStatus: null, toStatus: "PENDING", createdAt: new Date("2026-09-20T12:00:00Z") },
        { bookingId: bookingIds.staffAToday, fromStatus: "PENDING", toStatus: "CONFIRMED", changedByUserId: adminId, createdAt: new Date("2026-09-21T12:00:00Z") },
      ],
    });
  });

  afterAll(async () => {
    await prisma.booking.deleteMany({ where: { serviceId } });
    await prisma.service.deleteMany({ where: { id: serviceId } });
    await prisma.user.deleteMany({ where: { id: { in: [staffAId, staffBId, adminId] } } });
    await prisma.$disconnect();
  });

  it("uses New York today boundaries, separates upcoming, and orders deterministically", async () => {
    const today = await getAppointments(staffA, "today", fixedNow, prisma);
    const upcoming = await getAppointments(staffA, "upcoming", fixedNow, prisma);
    const overview = await getAppointmentOverview(staffA, fixedNow, prisma);

    expect(today.appointments.map((item) => item.id)).toEqual([bookingIds.staffAToday]);
    expect(upcoming.appointments.map((item) => item.id)).toEqual([
      bookingIds.staffAUpcoming,
      bookingIds.mutation,
      bookingIds.concurrent,
    ]);
    expect(overview.todayCount).toBe(1);
    expect(overview.upcomingCount).toBe(3);
    expect(overview.timezone).toBe("America/New_York");
  });

  it("enforces staff list/detail scope while admin can access all", async () => {
    const staffToday = await getAppointments(staffA, "today", fixedNow, prisma);
    const adminToday = await getAppointments(admin, "today", fixedNow, prisma);
    expect(staffToday.appointments).toHaveLength(1);
    expect(adminToday.appointments.map((item) => item.id)).toEqual(
      expect.arrayContaining([bookingIds.staffAToday, bookingIds.staffBToday]),
    );
    await expect(getAppointment(staffA, bookingIds.staffBToday, prisma)).resolves.toBeNull();
    await expect(getAppointment(admin, bookingIds.staffBToday, prisma)).resolves.toBeTruthy();

    const detail = await getAppointment(staffA, bookingIds.staffAToday, prisma);
    expect(detail?.statusEvents.map((event) => event.toStatus)).toEqual(["PENDING", "CONFIRMED"]);
    expect(detail?.statusEvents[1].changedByUser?.name).toBe("Admin Operator");
  });

  it("atomically updates own status and writes actor/note audit facts", async () => {
    await expect(
      updateBookingStatus(
        staffA,
        bookingIds.mutation,
        { expectedStatus: "PENDING", status: "CONFIRMED", note: "  Customer called.  " },
        prisma,
      ),
    ).resolves.toEqual({ status: "CONFIRMED" });
    const stored = await prisma.booking.findUnique({
      where: { id: bookingIds.mutation },
      include: { statusEvents: true },
    });
    expect(stored?.status).toBe("CONFIRMED");
    expect(stored?.statusEvents).toEqual([
      expect.objectContaining({
        fromStatus: "PENDING",
        toStatus: "CONFIRMED",
        changedByUserId: staffAId,
        note: "Customer called.",
      }),
    ]);
  });

  it("denies another staff member while admin can mutate any appointment", async () => {
    await expect(
      updateBookingStatus(staffA, bookingIds.adminMutation, { expectedStatus: "PENDING", status: "CONFIRMED" }, prisma),
    ).rejects.toBeInstanceOf(AppointmentNotFoundError);
    await expect(
      updateBookingStatus(admin, bookingIds.adminMutation, { expectedStatus: "PENDING", status: "CANCELLED" }, prisma),
    ).resolves.toEqual({ status: "CANCELLED" });
  });

  it("rejects invalid transitions without creating audit state", async () => {
    await expect(
      updateBookingStatus(staffA, bookingIds.staffAUpcoming, { expectedStatus: "PENDING", status: "COMPLETED" }, prisma),
    ).rejects.toBeInstanceOf(BookingStatusConflictError);
    expect(
      await prisma.bookingStatusEvent.count({ where: { bookingId: bookingIds.staffAUpcoming } }),
    ).toBe(0);
  });

  it("allows only one concurrent transition from the same expected state", async () => {
    const results = await Promise.allSettled([
      updateBookingStatus(staffA, bookingIds.concurrent, { expectedStatus: "PENDING", status: "CONFIRMED" }, prisma),
      updateBookingStatus(staffA, bookingIds.concurrent, { expectedStatus: "PENDING", status: "CANCELLED" }, prisma),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(
      await prisma.bookingStatusEvent.count({ where: { bookingId: bookingIds.concurrent } }),
    ).toBe(1);
  });
});


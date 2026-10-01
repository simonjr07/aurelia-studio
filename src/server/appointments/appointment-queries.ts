import "server-only";

import { DateTime } from "luxon";
import { z } from "zod";

import type { Prisma, PrismaClient } from "../../generated/prisma/client";
import type { CurrentUser } from "../auth/current-user-service";
import { getPrismaClient } from "../db/prisma";

type AppointmentDatabase = PrismaClient | Prisma.TransactionClient;
type AppointmentView = "today" | "upcoming";

async function getBoundaries(database: AppointmentDatabase, now: Date) {
  const settings = await database.businessSettings.findUnique({
    where: { id: "default" },
    select: { timezone: true },
  });
  if (!settings) throw new Error("Business settings are unavailable.");
  const localToday = DateTime.fromJSDate(now, { zone: settings.timezone }).startOf("day");
  return {
    timezone: settings.timezone,
    dayStart: localToday.toUTC().toJSDate(),
    tomorrowStart: localToday.plus({ days: 1 }).toUTC().toJSDate(),
  };
}

function scopeFor(actor: CurrentUser) {
  return actor.role === "ADMIN" ? {} : { staffId: actor.id };
}

const listSelect = {
  id: true,
  publicReference: true,
  status: true,
  customerName: true,
  startAt: true,
  endAt: true,
  timezoneSnapshot: true,
  serviceNameSnapshot: true,
  serviceDurationSnapshot: true,
  staff: { select: { id: true, name: true } },
} as const;

export async function getAppointmentOverview(
  actor: CurrentUser,
  now = new Date(),
  database: AppointmentDatabase = getPrismaClient(),
) {
  const { dayStart, tomorrowStart, timezone } = await getBoundaries(database, now);
  const scope = scopeFor(actor);
  const [todayCount, upcomingCount, nextAppointment, statusGroups] =
    await Promise.all([
      database.booking.count({
        where: { ...scope, startAt: { gte: dayStart, lt: tomorrowStart } },
      }),
      database.booking.count({
        where: { ...scope, startAt: { gte: tomorrowStart } },
      }),
      database.booking.findFirst({
        where: { ...scope, startAt: { gte: now } },
        orderBy: [{ startAt: "asc" }, { id: "asc" }],
        select: listSelect,
      }),
      actor.role === "ADMIN"
        ? database.booking.groupBy({
            by: ["status"],
            where: { startAt: { gte: dayStart, lt: tomorrowStart } },
            _count: { _all: true },
            orderBy: { status: "asc" },
          })
        : Promise.resolve([]),
    ]);

  return { todayCount, upcomingCount, nextAppointment, statusGroups, timezone };
}

export async function getAppointments(
  actor: CurrentUser,
  view: AppointmentView,
  now = new Date(),
  database: AppointmentDatabase = getPrismaClient(),
) {
  const { dayStart, tomorrowStart, timezone } = await getBoundaries(database, now);
  const timeWhere =
    view === "today"
      ? { gte: dayStart, lt: tomorrowStart }
      : { gte: tomorrowStart };
  const appointments = await database.booking.findMany({
    where: { ...scopeFor(actor), startAt: timeWhere },
    orderBy: [{ startAt: "asc" }, { id: "asc" }],
    select: listSelect,
  });
  return { appointments, timezone };
}

export async function getAppointment(
  actor: CurrentUser,
  bookingId: string,
  database: AppointmentDatabase = getPrismaClient(),
) {
  if (!z.uuid().safeParse(bookingId).success) return null;

  return database.booking.findFirst({
    where: { id: bookingId, ...scopeFor(actor) },
    select: {
      ...listSelect,
      customerEmail: true,
      customerPhone: true,
      customerNote: true,
      priceCentsSnapshot: true,
      currencySnapshot: true,
      createdAt: true,
      service: { select: { slug: true } },
      statusEvents: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          fromStatus: true,
          toStatus: true,
          note: true,
          createdAt: true,
          changedByUser: { select: { name: true } },
        },
      },
      rescheduleEvents: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true, fromStartAt: true, fromEndAt: true, toStartAt: true, toEndAt: true, fromStaffId: true, toStaffId: true, note: true, createdAt: true, changedByUser: { select: { name: true } } },
      },
    },
  });
}


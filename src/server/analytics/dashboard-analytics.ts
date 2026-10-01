import "server-only";

import { DateTime } from "luxon";

import { Prisma, type BookingStatus, type PrismaClient } from "../../generated/prisma/client";
import { assertAdminRole } from "../auth/authorization-policy";
import type { CurrentUser } from "../auth/current-user-service";
import { getPrismaClient } from "../db/prisma";
import {
  resolveAnalyticsRange,
  type AnalyticsFilterInput,
  type AnalyticsRange,
} from "./analytics-range";

type AnalyticsDatabase = PrismaClient | Prisma.TransactionClient;

type TrendRow = { date: string; count: number };
type ServiceRow = {
  serviceId: string;
  serviceName: string;
  bookingCount: number;
  scheduledMinutes: number;
};
type StaffRow = {
  staffId: string;
  staffName: string;
  appointmentCount: number;
  scheduledMinutes: number;
};

const statuses: BookingStatus[] = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
];

function fillTrend(range: AnalyticsRange, rows: TrendRow[]) {
  const counts = new Map(rows.map((row) => [row.date, Number(row.count)]));
  const start = DateTime.fromISO(range.startDate, { zone: range.timezone });
  return Array.from({ length: range.dayCount }, (_, index) => {
    const date = start.plus({ days: index }).toISODate()!;
    return { date, count: counts.get(date) ?? 0 };
  });
}

export async function getDashboardAnalytics(
  actor: CurrentUser,
  filter: AnalyticsFilterInput = {},
  now = new Date(),
  database: AnalyticsDatabase = getPrismaClient(),
) {
  assertAdminRole(actor);

  const settings = await database.businessSettings.findUnique({
    where: { id: "default" },
    select: { timezone: true },
  });
  if (!settings) throw new Error("Business settings are unavailable.");

  const range = resolveAnalyticsRange(filter, settings.timezone, now);
  const where = { startAt: { gte: range.startAt, lt: range.endAtExclusive } };

  const [statusRows, trendRows, serviceRows, staffRows] = await Promise.all([
    database.booking.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
      orderBy: { status: "asc" },
    }),
    database.$queryRaw<TrendRow[]>(Prisma.sql`
      SELECT
        to_char(("startAt" AT TIME ZONE ${range.timezone})::date, 'YYYY-MM-DD') AS "date",
        COUNT(*)::int AS "count"
      FROM "Booking"
      WHERE "startAt" >= ${range.startAt} AND "startAt" < ${range.endAtExclusive}
      GROUP BY 1
      ORDER BY 1 ASC
    `),
    database.$queryRaw<ServiceRow[]>(Prisma.sql`
      SELECT
        "serviceId" AS "serviceId",
        (array_agg("serviceNameSnapshot" ORDER BY "startAt" DESC, "id" DESC))[1] AS "serviceName",
        COUNT(*)::int AS "bookingCount",
        COALESCE(SUM("serviceDurationSnapshot"), 0)::int AS "scheduledMinutes"
      FROM "Booking"
      WHERE "startAt" >= ${range.startAt} AND "startAt" < ${range.endAtExclusive}
      GROUP BY "serviceId"
      ORDER BY "bookingCount" DESC, "serviceName" ASC, "serviceId" ASC
      LIMIT 10
    `),
    database.$queryRaw<StaffRow[]>(Prisma.sql`
      SELECT
        b."staffId" AS "staffId",
        u."name" AS "staffName",
        COUNT(*)::int AS "appointmentCount",
        COALESCE(SUM(b."serviceDurationSnapshot"), 0)::int AS "scheduledMinutes"
      FROM "Booking" b
      INNER JOIN "User" u ON u."id" = b."staffId"
      WHERE b."startAt" >= ${range.startAt}
        AND b."startAt" < ${range.endAtExclusive}
        AND b."status" <> 'CANCELLED'
      GROUP BY b."staffId", u."name"
      ORDER BY "scheduledMinutes" DESC, "appointmentCount" DESC, "staffName" ASC, "staffId" ASC
      LIMIT 10
    `),
  ]);

  const counts = Object.fromEntries(statuses.map((status) => [status, 0])) as Record<BookingStatus, number>;
  for (const row of statusRows) counts[row.status] = row._count._all;
  const total = statuses.reduce((sum, status) => sum + counts[status], 0);

  return {
    range,
    summary: { total, ...counts },
    statusBreakdown: statuses.map((status) => ({
      status,
      count: counts[status],
      percentage: total === 0 ? 0 : Math.round((counts[status] / total) * 100),
    })),
    trend: fillTrend(range, trendRows),
    popularServices: serviceRows.map((row) => ({ ...row, bookingCount: Number(row.bookingCount), scheduledMinutes: Number(row.scheduledMinutes) })),
    staffWorkload: staffRows.map((row) => ({ ...row, appointmentCount: Number(row.appointmentCount), scheduledMinutes: Number(row.scheduledMinutes) })),
  };
}

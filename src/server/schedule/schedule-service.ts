import "server-only";

import { DateTime } from "luxon";
import { z } from "zod";

import { Prisma, type PrismaClient } from "../../generated/prisma/client";
import type { CurrentUser } from "../auth/current-user-service";
import { resolveLocalWallTime } from "../availability/availability-engine";
import { getPrismaClient } from "../db/prisma";
import { createAvailabilityRuleSchema, createBlockedTimeSchema } from "./validation";

export class ScheduleNotFoundError extends Error {
  constructor() { super("Schedule record not found."); this.name = "ScheduleNotFoundError"; }
}
export class ScheduleConflictError extends Error {
  constructor(message: string) { super(message); this.name = "ScheduleConflictError"; }
}
export class DisabledStaffScheduleError extends Error {
  constructor() { super("New schedule entries cannot be added for disabled staff."); this.name = "DisabledStaffScheduleError"; }
}
export class ScheduleConfigurationError extends Error {
  constructor() { super("Studio schedule configuration is unavailable."); this.name = "ScheduleConfigurationError"; }
}

function db(database?: PrismaClient) { return database ?? getPrismaClient(); }
function mayManage(actor: CurrentUser, staffId: string) { return actor.role === "ADMIN" || actor.id === staffId; }
function isUuid(value: string) { return z.string().uuid().safeParse(value).success; }

async function findTarget(database: Prisma.TransactionClient | PrismaClient, actor: CurrentUser, staffId: string) {
  if (!mayManage(actor, staffId)) return null;
  return database.user.findFirst({ where: { id: staffId, role: "STAFF" }, select: { id: true, name: true, email: true, status: true } });
}

export async function listScheduleStaff(actor: CurrentUser, database?: PrismaClient) {
  if (actor.role !== "ADMIN") return [];
  return db(database).user.findMany({ where: { role: "STAFF" }, orderBy: [{ name: "asc" }, { email: "asc" }], select: { id: true, name: true, email: true, status: true, _count: { select: { availabilityRules: true, blockedTimes: true } } } });
}

export async function getScheduleForActor(actor: CurrentUser, staffId: string, database?: PrismaClient) {
  const databaseClient = db(database);
  const [staff, settings] = await Promise.all([
    findTarget(databaseClient, actor, staffId),
    databaseClient.businessSettings.findUnique({ where: { id: "default" }, select: { timezone: true } }),
  ]);
  if (!staff) return null;
  if (!settings) throw new ScheduleConfigurationError();
  const [rules, blockedTimes] = await Promise.all([
    databaseClient.availabilityRule.findMany({ where: { staffId, isActive: true }, orderBy: [{ weekday: "asc" }, { startLocalMinutes: "asc" }, { id: "asc" }], select: { id: true, weekday: true, startLocalMinutes: true, endLocalMinutes: true } }),
    databaseClient.blockedTime.findMany({ where: { staffId }, orderBy: [{ startAt: "asc" }, { id: "asc" }], take: 200, select: { id: true, startAt: true, endAt: true, reason: true } }),
  ]);
  return {
    staff, timezone: settings.timezone, rules,
    blockedTimes: blockedTimes.map((block) => {
      const start = DateTime.fromJSDate(block.startAt, { zone: settings.timezone });
      const end = DateTime.fromJSDate(block.endAt, { zone: settings.timezone });
      return { id: block.id, startAt: block.startAt.toISOString(), endAt: block.endAt.toISOString(), reason: block.reason, localDate: start.toISODate()!, startTime: start.toFormat("HH:mm"), endTime: end.toFormat("HH:mm") };
    }),
  };
}

export function resolveBlockedTime(date: string, startLocalMinutes: number, endLocalMinutes: number, timezone: string) {
  const start = resolveLocalWallTime(date, startLocalMinutes, timezone);
  const end = endLocalMinutes === 1440
    ? DateTime.fromISO(date, { zone: timezone }).plus({ days: 1 }).startOf("day")
    : resolveLocalWallTime(date, endLocalMinutes, timezone);
  if (!start || !end || !end.isValid || start >= end) throw new ScheduleConflictError("The local date or time is invalid in the studio timezone.");
  return { startAt: start.toJSDate(), endAt: end.toJSDate() };
}

export async function createAvailabilityRule(actor: CurrentUser, input: unknown, database?: PrismaClient) {
  const parsed = createAvailabilityRuleSchema.parse(input);
  try {
    return await db(database).$transaction(async (transaction) => {
      const staff = await findTarget(transaction, actor, parsed.staffId);
      if (!staff) throw new ScheduleNotFoundError();
      if (staff.status === "DISABLED") throw new DisabledStaffScheduleError();
      const overlap = await transaction.availabilityRule.findFirst({ where: { staffId: parsed.staffId, weekday: parsed.weekday, isActive: true, startLocalMinutes: { lt: parsed.endLocalMinutes }, endLocalMinutes: { gt: parsed.startLocalMinutes } }, select: { id: true } });
      if (overlap) throw new ScheduleConflictError("This availability overlaps an existing window.");
      return transaction.availabilityRule.create({ data: { ...parsed, isActive: true }, select: { id: true } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") throw new ScheduleConflictError("The schedule changed. Refresh and try again.");
    throw error;
  }
}

export async function deleteAvailabilityRule(actor: CurrentUser, id: string, database?: PrismaClient) {
  if (!isUuid(id)) throw new ScheduleNotFoundError();
  const rule = await db(database).availabilityRule.findFirst({ where: { id, staff: { role: "STAFF" } }, select: { id: true, staffId: true } });
  if (!rule || !mayManage(actor, rule.staffId)) throw new ScheduleNotFoundError();
  const result = await db(database).availabilityRule.deleteMany({ where: { id: rule.id, staffId: rule.staffId } });
  if (result.count !== 1) throw new ScheduleNotFoundError();
  return { id };
}

export async function createBlockedTime(actor: CurrentUser, input: unknown, database?: PrismaClient) {
  const parsed = createBlockedTimeSchema.parse(input);
  try {
    return await db(database).$transaction(async (transaction) => {
      const [staff, settings] = await Promise.all([
        findTarget(transaction, actor, parsed.staffId),
        transaction.businessSettings.findUnique({ where: { id: "default" }, select: { timezone: true } }),
      ]);
      if (!staff) throw new ScheduleNotFoundError();
      if (staff.status === "DISABLED") throw new DisabledStaffScheduleError();
      if (!settings) throw new ScheduleConfigurationError();
      const interval = resolveBlockedTime(parsed.date, parsed.startLocalMinutes, parsed.endLocalMinutes, settings.timezone);
      const [blockedOverlap, bookingOverlap] = await Promise.all([
        transaction.blockedTime.findFirst({ where: { staffId: parsed.staffId, startAt: { lt: interval.endAt }, endAt: { gt: interval.startAt } }, select: { id: true } }),
        transaction.booking.findFirst({ where: { staffId: parsed.staffId, status: { in: ["PENDING", "CONFIRMED"] }, startAt: { lt: interval.endAt }, endAt: { gt: interval.startAt } }, select: { id: true } }),
      ]);
      if (bookingOverlap) throw new ScheduleConflictError("Blocked time overlaps an existing appointment.");
      if (blockedOverlap) throw new ScheduleConflictError("Blocked time overlaps an existing blocked period.");
      return transaction.blockedTime.create({ data: { staffId: parsed.staffId, ...interval, reason: parsed.reason }, select: { id: true } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") throw new ScheduleConflictError("The schedule changed. Refresh and try again.");
    throw error;
  }
}

export async function deleteBlockedTime(actor: CurrentUser, id: string, database?: PrismaClient) {
  if (!isUuid(id)) throw new ScheduleNotFoundError();
  const block = await db(database).blockedTime.findFirst({ where: { id, staff: { role: "STAFF" } }, select: { id: true, staffId: true } });
  if (!block || !mayManage(actor, block.staffId)) throw new ScheduleNotFoundError();
  const result = await db(database).blockedTime.deleteMany({ where: { id: block.id, staffId: block.staffId } });
  if (result.count !== 1) throw new ScheduleNotFoundError();
  return { id };
}


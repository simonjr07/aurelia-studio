import "server-only";

import { DateTime } from "luxon";

import { Prisma, type BookingStatus, type PrismaClient } from "../../generated/prisma/client";
import type { CurrentUser } from "../auth/current-user-service";
import { getServiceAvailabilityWithinTransaction } from "../availability/availability-service";
import { getPrismaClient } from "../db/prisma";
import { getPublicBookingStatusLabel } from "./public-booking-lookup";
import { internalRescheduleSchema, publicCancellationSchema, publicRescheduleSchema } from "./change-validation";

export class BookingVerificationError extends Error { constructor() { super("Booking verification failed."); this.name = "BookingVerificationError"; } }
export class BookingPolicyError extends Error { constructor(message: string) { super(message); this.name = "BookingPolicyError"; } }
export class BookingChangeConflictError extends Error { constructor(message = "The booking changed. Refresh and try again.") { super(message); this.name = "BookingChangeConflictError"; } }
export class BookingChangeNotFoundError extends Error { constructor() { super("Appointment not found."); this.name = "BookingChangeNotFoundError"; } }

const mutableStatuses: BookingStatus[] = ["PENDING", "CONFIRMED"];
function cutoffAllows(now: Date, startAt: Date, cutoffMinutes: number) { return now.getTime() <= startAt.getTime() - cutoffMinutes * 60_000; }
function overlapError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (["P2004", "P2034"].includes(error.code)) return true;
  const cause = (error.meta as { driverAdapterError?: { cause?: { code?: unknown; originalCode?: unknown } } } | undefined)?.driverAdapterError?.cause;
  return error.code === "P2039" && (cause?.code === "23P01" || cause?.originalCode === "23P01");
}

function sanitizedDatabaseError(error: unknown) {
  if (!error || typeof error !== "object") return {};
  const record = error as {
    code?: unknown;
    meta?: { driverAdapterError?: { cause?: { code?: unknown; originalCode?: unknown } } };
    cause?: { code?: unknown; originalCode?: unknown };
  };
  const driverCause = record.meta?.driverAdapterError?.cause ?? record.cause;
  return {
    ...(error instanceof Error ? {
      prismaErrorClass: error.constructor.name,
      prismaErrorName: error.name,
    } : {}),
    ...(typeof record.code === "string" ? { prismaErrorCode: record.code } : {}),
    ...(typeof driverCause?.originalCode === "string"
      ? { driverErrorCode: driverCause.originalCode }
      : typeof driverCause?.code === "string"
        ? { driverErrorCode: driverCause.code }
        : {}),
  };
}

async function logPublicRescheduleVerificationFailure(
  transaction: Prisma.TransactionClient,
  input: { reference: string; email: string },
) {
  let queryError: unknown;
  const exists = async (where: { publicReference?: string; customerEmail?: string }) => {
    try {
      return Boolean(await transaction.booking.findFirst({ where, select: { id: true } }));
    } catch (error) {
      queryError ??= error;
      return false;
    }
  };
  const bookingExistsByReference = await exists({ publicReference: input.reference });
  let bookingsFoundByEmailCount = 0;
  try {
    bookingsFoundByEmailCount = await transaction.booking.count({
      where: { customerEmail: input.email },
    });
  } catch (error) {
    queryError ??= error;
  }
  let bookingByEmail: { publicReference: string } | null = null;
  try {
    bookingByEmail = await transaction.booking.findFirst({
      where: { customerEmail: input.email },
      select: { publicReference: true },
    });
  } catch (error) {
    queryError ??= error;
  }
  const bookingExistsByEmail = Boolean(bookingByEmail);
  const bookingExistsByCombinedReferenceAndEmail = await exists({
    publicReference: input.reference,
    customerEmail: input.email,
  });
  const storedReference = bookingByEmail?.publicReference ?? "";

  console.error("booking_reschedule_verification_diagnostic", {
    bookingExistsByReference,
    bookingExistsByEmail,
    bookingExistsByCombinedReferenceAndEmail,
    transactionStarted: true,
    storedReferenceEqualsSubmittedReference: storedReference === input.reference,
    storedReferenceLength: storedReference.length,
    submittedReferenceLength: input.reference.length,
    storedReferenceStartsWithAur: storedReference.startsWith("AUR-"),
    submittedReferenceStartsWithAur: input.reference.startsWith("AUR-"),
    bookingsFoundByEmailCount,
    ...sanitizedDatabaseError(queryError),
  });
}

const bookingSelect = {
  id: true, publicReference: true, status: true, serviceId: true, staffId: true,
  customerName: true, customerEmail: true, customerPhone: true, customerNote: true,
  startAt: true, endAt: true, updatedAt: true, timezoneSnapshot: true,
  serviceNameSnapshot: true, serviceDurationSnapshot: true, priceCentsSnapshot: true, currencySnapshot: true,
  staff: { select: { name: true } }, service: { select: { slug: true } },
} as const;

function publicResult(booking: { publicReference: string; status: BookingStatus; customerName: string; startAt: Date; endAt: Date; timezoneSnapshot: string; serviceNameSnapshot: string; serviceDurationSnapshot: number; priceCentsSnapshot: number; currencySnapshot: string; staff: { name: string } }) {
  return { reference: booking.publicReference, status: booking.status, statusLabel: getPublicBookingStatusLabel(booking.status), serviceName: booking.serviceNameSnapshot, staffName: booking.staff.name, startAt: booking.startAt.toISOString(), endAt: booking.endAt.toISOString(), timezone: booking.timezoneSnapshot, durationMinutes: booking.serviceDurationSnapshot, priceCents: booking.priceCentsSnapshot, currency: booking.currencySnapshot, customerName: booking.customerName };
}

export async function cancelPublicBooking(candidate: unknown, now = new Date(), database: PrismaClient = getPrismaClient()) {
  const input = publicCancellationSchema.parse(candidate);
  return database.$transaction(async (transaction) => {
    const booking = await transaction.booking.findFirst({ where: { publicReference: input.reference, customerEmail: input.email }, select: bookingSelect });
    const settings = await transaction.businessSettings.findUnique({ where: { id: "default" }, select: { cancellationCutoffMinutes: true } });
    if (!booking) throw new BookingVerificationError();
    if (!mutableStatuses.includes(booking.status)) throw new BookingChangeConflictError("This booking can no longer be cancelled online.");
    if (booking.status !== input.expectedStatus || booking.startAt.getTime() !== new Date(input.expectedStartAt).getTime()) throw new BookingChangeConflictError();
    if (!settings || !cutoffAllows(now, booking.startAt, settings.cancellationCutoffMinutes)) throw new BookingPolicyError("Online cancellation is no longer available for this appointment.");
    const updated = await transaction.booking.updateMany({ where: { id: booking.id, status: booking.status, startAt: booking.startAt }, data: { status: "CANCELLED" } });
    if (updated.count !== 1) throw new BookingChangeConflictError();
    await transaction.bookingStatusEvent.create({ data: { bookingId: booking.id, fromStatus: booking.status, toStatus: "CANCELLED", changedByUserId: null } });
    return publicResult({ ...booking, status: "CANCELLED" });
  });
}

export async function reschedulePublicBooking(candidate: unknown, now = new Date(), database: PrismaClient = getPrismaClient()) {
  const input = publicRescheduleSchema.parse(candidate);
  try {
    return await database.$transaction(async (transaction) => {
      const booking = await transaction.booking.findFirst({ where: { publicReference: input.reference, customerEmail: input.email }, select: bookingSelect });
      const settings = await transaction.businessSettings.findUnique({ where: { id: "default" }, select: { rescheduleCutoffMinutes: true, timezone: true } });
      if (!booking) {
        await logPublicRescheduleVerificationFailure(transaction, input);
        throw new BookingVerificationError();
      }
      if (!mutableStatuses.includes(booking.status)) throw new BookingChangeConflictError("This booking can no longer be rescheduled online.");
      if (booking.status !== input.expectedStatus || booking.startAt.getTime() !== new Date(input.expectedStartAt).getTime()) throw new BookingChangeConflictError();
      if (!settings || !cutoffAllows(now, booking.startAt, settings.rescheduleCutoffMinutes)) throw new BookingPolicyError("Online rescheduling is no longer available for this appointment.");
      const requested = new Date(input.startAt);
      const date = DateTime.fromJSDate(requested, { zone: settings.timezone }).toISODate();
      if (!date) throw new BookingChangeConflictError("That time is no longer available. Please choose another slot.");
      const availability = await getServiceAvailabilityWithinTransaction(transaction, { serviceSlug: booking.service.slug, date, staffId: input.staffId, now, excludeBookingId: booking.id, durationMinutesOverride: booking.serviceDurationSnapshot });
      const slot = availability.slots.find((item) => new Date(item.startAt).getTime() === requested.getTime());
      if (!slot?.eligibleStaff.length) throw new BookingChangeConflictError("That time is no longer available. Please choose another slot.");
      const selected = [...slot.eligibleStaff].sort((a, b) => a.id.localeCompare(b.id))[0];
      const endAt = new Date(requested.getTime() + booking.serviceDurationSnapshot * 60_000);
      const updated = await transaction.booking.updateMany({ where: { id: booking.id, status: booking.status, startAt: booking.startAt }, data: { staffId: selected.id, startAt: requested, endAt } });
      if (updated.count !== 1) throw new BookingChangeConflictError();
      await transaction.bookingRescheduleEvent.create({ data: { bookingId: booking.id, fromStaffId: booking.staffId, toStaffId: selected.id, fromStartAt: booking.startAt, fromEndAt: booking.endAt, toStartAt: requested, toEndAt: endAt, changedByUserId: null } });
      return publicResult({ ...booking, staff: { name: selected.name }, startAt: requested, endAt });
    });
  } catch (error) {
    if (overlapError(error)) throw new BookingChangeConflictError("That time is no longer available. Please choose another slot.");
    throw error;
  }
}

export async function rescheduleInternalBooking(actor: CurrentUser, bookingId: string, candidate: unknown, now = new Date(), database: PrismaClient = getPrismaClient()) {
  const input = internalRescheduleSchema.parse(candidate);
  try {
    return await database.$transaction(async (transaction) => {
      const booking = await transaction.booking.findFirst({ where: { id: bookingId, ...(actor.role === "ADMIN" ? {} : { staffId: actor.id }) }, select: bookingSelect });
      const settings = await transaction.businessSettings.findUnique({ where: { id: "default" }, select: { timezone: true } });
      if (!booking || !settings) throw new BookingChangeNotFoundError();
      if (!mutableStatuses.includes(booking.status) || booking.status !== input.expectedStatus || booking.startAt.getTime() !== new Date(input.expectedStartAt).getTime()) throw new BookingChangeConflictError();
      const targetStaffId = actor.role === "STAFF" ? actor.id : input.staffId;
      const requested = new Date(input.startAt); const date = DateTime.fromJSDate(requested, { zone: settings.timezone }).toISODate();
      if (!date) throw new BookingChangeConflictError("That time is no longer available. Please choose another slot.");
      const availability = await getServiceAvailabilityWithinTransaction(transaction, { serviceSlug: booking.service.slug, date, staffId: targetStaffId, now, excludeBookingId: booking.id, durationMinutesOverride: booking.serviceDurationSnapshot });
      const slot = availability.slots.find((item) => new Date(item.startAt).getTime() === requested.getTime());
      if (!slot?.eligibleStaff.length) throw new BookingChangeConflictError("That time is no longer available. Please choose another slot.");
      const selected = [...slot.eligibleStaff].sort((a, b) => a.id.localeCompare(b.id))[0];
      if (actor.role === "STAFF" && selected.id !== actor.id) throw new BookingChangeNotFoundError();
      const endAt = new Date(requested.getTime() + booking.serviceDurationSnapshot * 60_000);
      const updated = await transaction.booking.updateMany({ where: { id: booking.id, status: booking.status, startAt: booking.startAt }, data: { staffId: selected.id, startAt: requested, endAt } });
      if (updated.count !== 1) throw new BookingChangeConflictError();
      await transaction.bookingRescheduleEvent.create({ data: { bookingId: booking.id, fromStaffId: booking.staffId, toStaffId: selected.id, fromStartAt: booking.startAt, fromEndAt: booking.endAt, toStartAt: requested, toEndAt: endAt, changedByUserId: actor.id, note: input.note } });
      return { id: booking.id, status: booking.status, startAt: requested.toISOString(), endAt: endAt.toISOString(), staffId: selected.id };
    });
  } catch (error) { if (overlapError(error)) throw new BookingChangeConflictError("That time is no longer available. Please choose another slot."); throw error; }
}


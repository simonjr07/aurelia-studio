import "server-only";

import type { BookingStatus } from "../../generated/prisma/enums";
import { getPrismaClient } from "../db/prisma";
import { publicBookingLookupSchema } from "./lookup-validation";

const bookingStatusLabels: Record<BookingStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No-show",
};

export function getPublicBookingStatusLabel(status: BookingStatus) {
  return bookingStatusLabels[status];
}

export class PublicBookingVerificationError extends Error {
  constructor() {
    super("Booking verification failed.");
    this.name = "PublicBookingVerificationError";
  }
}

export type PublicBookingDetail = {
  reference: string;
  status: BookingStatus;
  statusLabel: string;
  serviceName: string;
  staffName: string;
  startAt: string;
  endAt: string;
  timezone: string;
  durationMinutes: number;
  priceCents: number;
  currency: string;
  customerName: string;
  serviceSlug: string;
  staffId: string;
  cancellationCutoffMinutes: number;
  rescheduleCutoffMinutes: number;
  canCancel: boolean;
  canReschedule: boolean;
  cancellationCutoffAt: string;
  rescheduleCutoffAt: string;
};

export async function verifyPublicBooking(
  candidate: unknown,
  now = new Date(),
): Promise<PublicBookingDetail> {
  const input = publicBookingLookupSchema.parse(candidate);
  const prisma = getPrismaClient();
  const [booking, settings] = await Promise.all([prisma.booking.findFirst({
    where: {
      publicReference: input.reference,
      customerEmail: input.email,
    },
    select: {
      publicReference: true,
      status: true,
      customerName: true,
      startAt: true,
      endAt: true,
      timezoneSnapshot: true,
      serviceNameSnapshot: true,
      serviceDurationSnapshot: true,
      priceCentsSnapshot: true,
      currencySnapshot: true,
      staff: { select: { id: true, name: true } },
      service: { select: { slug: true } },
    },
  }), prisma.businessSettings.findUnique({ where: { id: "default" }, select: { cancellationCutoffMinutes: true, rescheduleCutoffMinutes: true } })]);

  if (!booking || !settings) {
    throw new PublicBookingVerificationError();
  }

  const mutable = booking.status === "PENDING" || booking.status === "CONFIRMED";
  const cancellationCutoffAt = new Date(booking.startAt.getTime() - settings.cancellationCutoffMinutes * 60_000);
  const rescheduleCutoffAt = new Date(booking.startAt.getTime() - settings.rescheduleCutoffMinutes * 60_000);
  return {
    reference: booking.publicReference,
    status: booking.status,
    statusLabel: getPublicBookingStatusLabel(booking.status),
    serviceName: booking.serviceNameSnapshot,
    staffName: booking.staff.name,
    startAt: booking.startAt.toISOString(),
    endAt: booking.endAt.toISOString(),
    timezone: booking.timezoneSnapshot,
    durationMinutes: booking.serviceDurationSnapshot,
    priceCents: booking.priceCentsSnapshot,
    currency: booking.currencySnapshot,
    customerName: booking.customerName,
    serviceSlug: booking.service.slug,
    staffId: booking.staff.id,
    ...settings,
    canCancel: mutable && now <= cancellationCutoffAt,
    canReschedule: mutable && now <= rescheduleCutoffAt,
    cancellationCutoffAt: cancellationCutoffAt.toISOString(),
    rescheduleCutoffAt: rescheduleCutoffAt.toISOString(),
  };
}


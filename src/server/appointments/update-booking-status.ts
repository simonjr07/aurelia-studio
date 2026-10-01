import "server-only";

import type { BookingStatus, Prisma, PrismaClient } from "../../generated/prisma/client";
import { z } from "zod";
import type { CurrentUser } from "../auth/current-user-service";
import { getPrismaClient } from "../db/prisma";
import { canTransitionBookingStatus } from "./status-transitions";
import { bookingStatusUpdateSchema } from "./validation";

export class AppointmentNotFoundError extends Error {
  constructor() {
    super("Appointment not found.");
    this.name = "AppointmentNotFoundError";
  }
}

export class BookingStatusConflictError extends Error {
  constructor() {
    super("The appointment status changed or the transition is not allowed.");
    this.name = "BookingStatusConflictError";
  }
}

type StatusDatabase = PrismaClient;

export async function updateBookingStatus(
  actor: CurrentUser,
  bookingId: string,
  candidate: unknown,
  database: StatusDatabase = getPrismaClient(),
) {
  if (!z.uuid().safeParse(bookingId).success) throw new AppointmentNotFoundError();
  const input = bookingStatusUpdateSchema.parse(candidate);

  return database.$transaction(async (transaction: Prisma.TransactionClient) => {
    const booking = await transaction.booking.findFirst({
      where: {
        id: bookingId,
        ...(actor.role === "ADMIN" ? {} : { staffId: actor.id }),
      },
      select: { id: true, status: true },
    });

    if (!booking) throw new AppointmentNotFoundError();
    if (
      booking.status !== input.expectedStatus ||
      !canTransitionBookingStatus(booking.status, input.status)
    ) {
      throw new BookingStatusConflictError();
    }

    const updated = await transaction.booking.updateMany({
      where: { id: booking.id, status: booking.status },
      data: { status: input.status },
    });
    if (updated.count !== 1) throw new BookingStatusConflictError();

    await transaction.bookingStatusEvent.create({
      data: {
        bookingId: booking.id,
        fromStatus: booking.status,
        toStatus: input.status,
        changedByUserId: actor.id,
        note: input.note,
      },
    });

    return { status: input.status as BookingStatus };
  });
}


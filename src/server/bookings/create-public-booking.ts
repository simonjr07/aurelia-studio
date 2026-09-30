import "server-only";

import { DateTime } from "luxon";

import { Prisma } from "../../generated/prisma/client";
import {
  AvailabilityStaffNotEligibleError,
  InvalidAvailabilityDateError,
  PublicServiceNotFoundError,
  getServiceAvailabilityWithDatabase,
} from "../availability/availability-service";
import { getPrismaClient } from "../db/prisma";
import { createBookingReference } from "./reference";
import {
  publicBookingRequestSchema,
  type PublicBookingInput,
} from "./validation";

export class BookingServiceUnavailableError extends Error {
  constructor() {
    super("The requested service is unavailable.");
    this.name = "BookingServiceUnavailableError";
  }
}

export class BookingConflictError extends Error {
  constructor() {
    super("The requested time is no longer available.");
    this.name = "BookingConflictError";
  }
}

export class BookingConfigurationError extends Error {
  constructor() {
    super("Booking configuration is unavailable.");
    this.name = "BookingConfigurationError";
  }
}

export type PublicBookingResult = {
  reference: string;
  status: "PENDING";
  serviceName: string;
  staffName: string;
  startAt: string;
  endAt: string;
  timezone: string;
  durationMinutes: number;
  priceCents: number;
  currency: string;
};

const MAX_REFERENCE_ATTEMPTS = 3;

function isReferenceCollision(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function isOverlapConflict(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  return error.code === "P2004" || error.code === "P2034";
}

async function createWithReference(
  input: PublicBookingInput,
  publicReference: string,
  now: Date,
): Promise<PublicBookingResult> {
  const prisma = getPrismaClient();

  return prisma.$transaction(async (transaction) => {
    const [service, settings] = await Promise.all([
      transaction.service.findFirst({
        where: {
          slug: input.serviceSlug,
          isPublished: true,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          durationMinutes: true,
          priceCents: true,
          currency: true,
        },
      }),
      transaction.businessSettings.findUnique({
        where: { id: "default" },
        select: { timezone: true },
      }),
    ]);

    if (!service) {
      throw new BookingServiceUnavailableError();
    }

    if (!settings) {
      throw new BookingConfigurationError();
    }

    const requestedInstant = new Date(input.startAt);
    const requestedDate = DateTime.fromJSDate(requestedInstant, {
      zone: settings.timezone,
    }).toISODate();

    if (!requestedDate) {
      throw new BookingConflictError();
    }

    let availability;
    try {
      availability = await getServiceAvailabilityWithDatabase(transaction, {
        serviceSlug: input.serviceSlug,
        date: requestedDate,
        staffId: input.staffId,
        now,
      });
    } catch (error) {
      if (
        error instanceof AvailabilityStaffNotEligibleError ||
        error instanceof InvalidAvailabilityDateError ||
        error instanceof PublicServiceNotFoundError
      ) {
        throw new BookingConflictError();
      }

      throw error;
    }

    const slot = availability.slots.find(
      (candidate) =>
        new Date(candidate.startAt).getTime() === requestedInstant.getTime(),
    );

    if (!slot || slot.eligibleStaff.length === 0) {
      throw new BookingConflictError();
    }

    const selectedStaff = [...slot.eligibleStaff].sort((left, right) =>
      left.id.localeCompare(right.id),
    )[0];
    const endAt = new Date(
      requestedInstant.getTime() + service.durationMinutes * 60_000,
    );

    const booking = await transaction.booking.create({
      data: {
        publicReference,
        status: "PENDING",
        serviceId: service.id,
        staffId: selectedStaff.id,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        customerNote: input.customerNote,
        startAt: requestedInstant,
        endAt,
        timezoneSnapshot: settings.timezone,
        serviceNameSnapshot: service.name,
        serviceDurationSnapshot: service.durationMinutes,
        priceCentsSnapshot: service.priceCents,
        currencySnapshot: service.currency,
        statusEvents: {
          create: {
            fromStatus: null,
            toStatus: "PENDING",
            changedByUserId: null,
          },
        },
      },
      select: { publicReference: true },
    });

    return {
      reference: booking.publicReference,
      status: "PENDING",
      serviceName: service.name,
      staffName: selectedStaff.name,
      startAt: requestedInstant.toISOString(),
      endAt: endAt.toISOString(),
      timezone: settings.timezone,
      durationMinutes: service.durationMinutes,
      priceCents: service.priceCents,
      currency: service.currency,
    };
  });
}

export async function createPublicBooking(
  candidate: unknown,
  options: {
    now?: Date;
    generateReference?: () => string;
  } = {},
) {
  const input = publicBookingRequestSchema.parse(candidate);
  const now = options.now ?? new Date();
  const generateReference = options.generateReference ?? createBookingReference;

  for (let attempt = 0; attempt < MAX_REFERENCE_ATTEMPTS; attempt += 1) {
    try {
      return await createWithReference(input, generateReference(), now);
    } catch (error) {
      if (isReferenceCollision(error) && attempt < MAX_REFERENCE_ATTEMPTS - 1) {
        continue;
      }

      if (isOverlapConflict(error)) {
        throw new BookingConflictError();
      }

      throw error;
    }
  }

  throw new Error("Unable to allocate a booking reference.");
}

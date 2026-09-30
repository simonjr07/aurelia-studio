import { ZodError } from "zod";

import {
  BookingConfigurationError,
  BookingConflictError,
  BookingServiceUnavailableError,
  createPublicBooking,
} from "../../../server/bookings/create-public-booking";
import { enforceBookingRateLimit } from "../../../server/bookings/rate-limit";
import { publicBookingRequestSchema } from "../../../server/bookings/validation";

export const dynamic = "force-dynamic";

const responseHeaders = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid booking request." },
      { status: 400, headers: responseHeaders },
    );
  }

  const parsed = publicBookingRequestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      {
        error: "Please correct the highlighted fields.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400, headers: responseHeaders },
    );
  }

  try {
    const allowed = await enforceBookingRateLimit(
      parsed.data.customerEmail,
      request,
    );

    if (!allowed) {
      return Response.json(
        { error: "Too many booking attempts. Please try again later." },
        { status: 429, headers: responseHeaders },
      );
    }

    const booking = await createPublicBooking(parsed.data);
    return Response.json(booking, {
      status: 201,
      headers: responseHeaders,
    });
  } catch (error) {
    if (error instanceof BookingServiceUnavailableError) {
      return Response.json(
        { error: "Service not found." },
        { status: 404, headers: responseHeaders },
      );
    }

    if (error instanceof BookingConflictError) {
      return Response.json(
        {
          code: "BOOKING_CONFLICT",
          error: "That time is no longer available. Please choose another slot.",
        },
        { status: 409, headers: responseHeaders },
      );
    }

    if (error instanceof ZodError) {
      return Response.json(
        { error: "Invalid booking request." },
        { status: 400, headers: responseHeaders },
      );
    }

    if (error instanceof BookingConfigurationError) {
      return Response.json(
        { error: "Booking is temporarily unavailable." },
        { status: 500, headers: responseHeaders },
      );
    }

    return Response.json(
      { error: "Booking is temporarily unavailable." },
      { status: 500, headers: responseHeaders },
    );
  }
}


import { ZodError } from "zod";

import { enforceBookingLookupRateLimit } from "../../../../server/bookings/lookup-rate-limit";
import { publicBookingLookupSchema } from "../../../../server/bookings/lookup-validation";
import {
  PublicBookingVerificationError,
  verifyPublicBooking,
} from "../../../../server/bookings/public-booking-lookup";

export const dynamic = "force-dynamic";

const responseHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
};
const verificationFailure = {
  error:
    "We couldn’t verify that booking. Check your reference and email and try again.",
};

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid booking lookup request." },
      { status: 400, headers: responseHeaders },
    );
  }

  const parsed = publicBookingLookupSchema.safeParse(body);

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
    const allowed = await enforceBookingLookupRateLimit(parsed.data, request);

    if (!allowed) {
      return Response.json(
        { error: "Too many lookup attempts. Please try again later." },
        { status: 429, headers: responseHeaders },
      );
    }

    const booking = await verifyPublicBooking(parsed.data);
    return Response.json(booking, { headers: responseHeaders });
  } catch (error) {
    if (error instanceof PublicBookingVerificationError) {
      return Response.json(verificationFailure, {
        status: 404,
        headers: responseHeaders,
      });
    }

    if (error instanceof ZodError) {
      return Response.json(
        { error: "Invalid booking lookup request." },
        { status: 400, headers: responseHeaders },
      );
    }

    return Response.json(
      { error: "Booking lookup is temporarily unavailable." },
      { status: 500, headers: responseHeaders },
    );
  }
}


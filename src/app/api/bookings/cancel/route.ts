import { ZodError } from "zod";
import { BookingChangeConflictError, BookingPolicyError, BookingVerificationError, cancelPublicBooking } from "../../../../server/bookings/change-booking";
import { enforceBookingChangeRateLimit } from "../../../../server/bookings/change-rate-limit";
import { publicCancellationSchema } from "../../../../server/bookings/change-validation";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache" };
export async function POST(request: Request) {
  let body: unknown; try { body = await request.json(); } catch { return Response.json({ error: "Invalid cancellation request." }, { status: 400, headers }); }
  const parsed = publicCancellationSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Please correct the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400, headers });
  try {
    if (!(await enforceBookingChangeRateLimit(parsed.data, request, "PUBLIC_BOOKING_CANCEL"))) return Response.json({ error: "Too many cancellation attempts. Please try again later." }, { status: 429, headers });
    return Response.json(await cancelPublicBooking(parsed.data), { headers });
  } catch (error) {
    if (error instanceof BookingVerificationError) return Response.json({ error: "We couldn’t verify that booking. Check your reference and email and try again." }, { status: 404, headers });
    if (error instanceof BookingPolicyError) return Response.json({ error: error.message }, { status: 422, headers });
    if (error instanceof BookingChangeConflictError) return Response.json({ error: error.message }, { status: 409, headers });
    if (error instanceof ZodError) return Response.json({ error: "Invalid cancellation request." }, { status: 400, headers });
    return Response.json({ error: "Cancellation is temporarily unavailable." }, { status: 500, headers });
  }
}


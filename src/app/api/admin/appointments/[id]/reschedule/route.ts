import { ZodError } from "zod";
import { getCurrentUser } from "../../../../../../server/auth/current-user";
import { BookingChangeConflictError, BookingChangeNotFoundError, rescheduleInternalBooking } from "../../../../../../server/bookings/change-booking";

export const dynamic = "force-dynamic";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser(); if (!actor) return Response.json({ error: "Authentication required." }, { status: 401 });
  let body: unknown; try { body = await request.json(); } catch { return Response.json({ error: "Invalid reschedule request." }, { status: 400 }); }
  try { return Response.json(await rescheduleInternalBooking(actor, (await params).id, body), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) {
    if (error instanceof ZodError) return Response.json({ error: "Invalid reschedule request.", fieldErrors: error.flatten().fieldErrors }, { status: 400 });
    if (error instanceof BookingChangeNotFoundError) return Response.json({ error: "Appointment not found." }, { status: 404 });
    if (error instanceof BookingChangeConflictError) return Response.json({ error: error.message }, { status: 409 });
    return Response.json({ error: "The appointment could not be rescheduled." }, { status: 500 });
  }
}


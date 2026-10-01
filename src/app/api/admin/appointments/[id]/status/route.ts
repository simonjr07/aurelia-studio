import { ZodError } from "zod";

import { getCurrentUser } from "../../../../../../server/auth/current-user";
import {
  AppointmentNotFoundError,
  BookingStatusConflictError,
  updateBookingStatus,
} from "../../../../../../server/appointments/update-booking-status";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getCurrentUser();
  if (!actor) return Response.json({ error: "Authentication required." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid status request." }, { status: 400 });
  }

  try {
    const { id } = await params;
    const result = await updateBookingStatus(actor, id, body);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json({ error: "Invalid status request." }, { status: 400 });
    }
    if (error instanceof AppointmentNotFoundError) {
      return Response.json({ error: "Appointment not found." }, { status: 404 });
    }
    if (error instanceof BookingStatusConflictError) {
      return Response.json(
        { error: "This appointment changed. Refresh and try again." },
        { status: 409 },
      );
    }
    return Response.json(
      { error: "The appointment could not be updated." },
      { status: 500 },
    );
  }
}


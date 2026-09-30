import type { NextRequest } from "next/server";

import {
  AvailabilityConfigurationError,
  AvailabilityStaffNotEligibleError,
  InvalidAvailabilityDateError,
  PublicServiceNotFoundError,
  getServiceAvailability,
} from "../../../server/availability/availability-service";
import { availabilityRequestSchema } from "../../../server/availability/request-validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const parsed = availabilityRequestSchema.safeParse({
    service: request.nextUrl.searchParams.get("service") ?? undefined,
    date: request.nextUrl.searchParams.get("date") ?? undefined,
    staff: request.nextUrl.searchParams.get("staff") ?? undefined,
  });

  if (!parsed.success) {
    return Response.json(
      { error: "Invalid availability request." },
      { status: 400 },
    );
  }

  try {
    const availability = await getServiceAvailability({
      serviceSlug: parsed.data.service,
      date: parsed.data.date,
      staffId: parsed.data.staff,
    });

    return Response.json(availability, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof PublicServiceNotFoundError) {
      return Response.json({ error: "Service not found." }, { status: 404 });
    }

    if (error instanceof AvailabilityStaffNotEligibleError) {
      return Response.json({ error: "Staff member not found." }, { status: 404 });
    }

    if (error instanceof InvalidAvailabilityDateError) {
      return Response.json(
        { error: "Invalid availability date." },
        { status: 400 },
      );
    }

    if (error instanceof AvailabilityConfigurationError) {
      return Response.json(
        { error: "Availability is temporarily unavailable." },
        { status: 500 },
      );
    }

    return Response.json(
      { error: "Availability is temporarily unavailable." },
      { status: 500 },
    );
  }
}

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

const noStoreHeaders = { "Cache-Control": "no-store" };

function availabilityResponse(body: { error: string }, status: number) {
  return Response.json(body, { headers: noStoreHeaders, status });
}

export async function GET(request: NextRequest) {
  const parsed = availabilityRequestSchema.safeParse({
    service: request.nextUrl.searchParams.get("service") ?? undefined,
    date: request.nextUrl.searchParams.get("date") ?? undefined,
    staff: request.nextUrl.searchParams.get("staff") ?? undefined,
  });

  if (!parsed.success) {
    return availabilityResponse({ error: "Invalid availability request." }, 400);
  }

  try {
    const availability = await getServiceAvailability({
      serviceSlug: parsed.data.service,
      date: parsed.data.date,
      staffId: parsed.data.staff,
    });

    return Response.json(availability, {
      headers: noStoreHeaders,
    });
  } catch (error) {
    if (error instanceof PublicServiceNotFoundError) {
      return availabilityResponse({ error: "Service not found." }, 404);
    }

    if (error instanceof AvailabilityStaffNotEligibleError) {
      return availabilityResponse({ error: "Staff member not found." }, 404);
    }

    if (error instanceof InvalidAvailabilityDateError) {
      return availabilityResponse({ error: "Invalid availability date." }, 400);
    }

    if (error instanceof AvailabilityConfigurationError) {
      return availabilityResponse(
        { error: "Availability is temporarily unavailable." },
        500,
      );
    }

    return availabilityResponse(
      { error: "Availability is temporarily unavailable." },
      500,
    );
  }
}

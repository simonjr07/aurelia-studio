import { ZodError } from "zod";

import { getCurrentUser } from "../auth/current-user";
import { DisabledStaffScheduleError, ScheduleConfigurationError, ScheduleConflictError, ScheduleNotFoundError } from "./schedule-service";

export async function getScheduleActor() {
  const actor = await getCurrentUser();
  if (!actor) return { response: Response.json({ error: "Authentication required." }, { status: 401 }) } as const;
  return { actor } as const;
}

export async function readScheduleJson(request: Request) {
  try { return { body: await request.json() } as const; }
  catch { return { response: Response.json({ error: "Invalid request body." }, { status: 400 }) } as const; }
}

export function scheduleErrorResponse(error: unknown) {
  if (error instanceof ZodError) return Response.json({ error: "Check the entered schedule values.", fields: error.flatten().fieldErrors }, { status: 400 });
  if (error instanceof ScheduleNotFoundError) return Response.json({ error: "Schedule record not found." }, { status: 404 });
  if (error instanceof ScheduleConflictError || error instanceof DisabledStaffScheduleError) return Response.json({ error: error.message }, { status: 409 });
  if (error instanceof ScheduleConfigurationError) return Response.json({ error: "Studio schedule configuration is unavailable." }, { status: 503 });
  return Response.json({ error: "The schedule change could not be saved." }, { status: 500 });
}


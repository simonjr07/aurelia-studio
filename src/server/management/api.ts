import { ZodError } from "zod";

import { AuthorizationError } from "../auth/authorization-policy";
import { getCurrentUser } from "../auth/current-user";
import { ManagementConflictError, ManagementNotFoundError } from "./management-service";

export async function getManagementActor() {
  const actor = await getCurrentUser();
  if (!actor) return { response: Response.json({ error: "Authentication required." }, { status: 401 }) } as const;
  if (actor.role !== "ADMIN") return { response: Response.json({ error: "Administrator access required." }, { status: 403 }) } as const;
  return { actor } as const;
}

export async function readJson(request: Request) {
  try {
    return { body: await request.json() } as const;
  } catch {
    return { response: Response.json({ error: "Invalid request body." }, { status: 400 }) } as const;
  }
}

export function managementErrorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return Response.json({ error: "Check the highlighted values and try again.", fields: error.flatten().fieldErrors }, { status: 400 });
  }
  if (error instanceof AuthorizationError) return Response.json({ error: "Administrator access required." }, { status: 403 });
  if (error instanceof ManagementConflictError) return Response.json({ error: error.message }, { status: 409 });
  if (error instanceof ManagementNotFoundError) return Response.json({ error: error.message }, { status: 404 });
  return Response.json({ error: "The change could not be saved." }, { status: 500 });
}


import { getManagementActor, managementErrorResponse, readJson } from "../../../../../../server/management/api";
import { updateStaffServiceAssignments } from "../../../../../../server/management/management-service";

export const dynamic = "force-dynamic";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await getManagementActor();
  if ("response" in access) return access.response;
  const input = await readJson(request);
  if ("response" in input) return input.response;
  try {
    const { id } = await params;
    return Response.json(await updateStaffServiceAssignments(access.actor, id, input.body), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return managementErrorResponse(error);
  }
}


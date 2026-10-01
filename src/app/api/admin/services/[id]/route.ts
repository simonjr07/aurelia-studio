import { getManagementActor, managementErrorResponse, readJson } from "../../../../../server/management/api";
import { updateService } from "../../../../../server/management/management-service";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await getManagementActor();
  if ("response" in access) return access.response;
  const input = await readJson(request);
  if ("response" in input) return input.response;
  try {
    const { id } = await params;
    return Response.json(await updateService(access.actor, id, input.body), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return managementErrorResponse(error);
  }
}


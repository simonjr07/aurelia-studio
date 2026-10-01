import { getManagementActor, managementErrorResponse, readJson } from "../../../../server/management/api";
import { createStaff } from "../../../../server/management/management-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const access = await getManagementActor();
  if ("response" in access) return access.response;
  const input = await readJson(request);
  if ("response" in input) return input.response;
  try {
    const result = await createStaff(access.actor, input.body);
    return Response.json(result, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return managementErrorResponse(error);
  }
}


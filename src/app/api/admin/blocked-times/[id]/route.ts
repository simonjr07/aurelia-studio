import { getScheduleActor, scheduleErrorResponse } from "../../../../../server/schedule/api";
import { deleteBlockedTime } from "../../../../../server/schedule/schedule-service";

export const dynamic = "force-dynamic";
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await getScheduleActor(); if ("response" in access) return access.response;
  try { return Response.json(await deleteBlockedTime(access.actor, (await params).id), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return scheduleErrorResponse(error); }
}


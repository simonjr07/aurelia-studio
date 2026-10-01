import { getScheduleActor, readScheduleJson, scheduleErrorResponse } from "../../../../server/schedule/api";
import { createBlockedTime } from "../../../../server/schedule/schedule-service";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const access = await getScheduleActor(); if ("response" in access) return access.response;
  const input = await readScheduleJson(request); if ("response" in input) return input.response;
  try { return Response.json(await createBlockedTime(access.actor, input.body), { status: 201, headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return scheduleErrorResponse(error); }
}


import Link from "next/link";
import { notFound } from "next/navigation";

import { requireStaff } from "@/server/auth/access";
import { getScheduleForActor } from "@/server/schedule/schedule-service";

import { ScheduleEditor } from "../schedule-editor";

export default async function StaffAvailabilityPage({ params }: { params: Promise<{ staffId: string }> }) {
  const actor = await requireStaff();
  const schedule = await getScheduleForActor(actor, (await params).staffId);
  if (!schedule) notFound();
  return <main className="px-6 py-10 sm:px-10 sm:py-14"><div className="mx-auto max-w-6xl">
    {actor.role === "ADMIN" ? <Link className="text-sm font-semibold underline underline-offset-4" href="/admin/availability">← Availability</Link> : null}
    <div className="mt-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-clay">Weekly schedule</p><h1 className="mt-3 font-display text-5xl">{schedule.staff.name}</h1><p className="mt-2 text-sm text-ink/50">Studio timezone: {schedule.timezone}</p></div><span className={`text-xs font-bold uppercase ${schedule.staff.status === "ACTIVE" ? "text-forest" : "text-clay"}`}>{schedule.staff.status}</span></div>
    {schedule.staff.status === "DISABLED" ? <p className="mt-6 rounded-xl border border-clay/30 bg-clay/5 p-4 text-sm">This staff account is disabled. Existing schedule entries can be inspected or removed, but new entries cannot be added.</p> : null}
    <ScheduleEditor schedule={schedule} />
  </div></main>;
}


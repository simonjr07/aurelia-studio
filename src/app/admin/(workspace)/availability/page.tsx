import Link from "next/link";
import { redirect } from "next/navigation";

import { requireStaff } from "@/server/auth/access";
import { listScheduleStaff } from "@/server/schedule/schedule-service";

export const metadata = { title: "Availability" };

export default async function AvailabilityPage() {
  const actor = await requireStaff();
  if (actor.role === "STAFF") redirect(`/admin/availability/${actor.id}`);
  const staff = await listScheduleStaff(actor);
  return <main className="px-6 py-10 sm:px-10 sm:py-14"><div className="mx-auto max-w-6xl">
    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-clay">Schedule management</p>
    <h1 className="mt-4 font-display text-5xl sm:text-6xl">Availability</h1>
    <p className="mt-5 max-w-2xl text-ink/60">Choose a staff member to manage weekly working windows and exceptional blocked time.</p>
    {staff.length === 0 ? <p className="mt-10 rounded-2xl border border-ink/10 bg-white p-7">No staff accounts are available.</p> : <ul className="mt-8 grid gap-4 sm:grid-cols-2">{staff.map((person) => <li key={person.id}><Link className="block rounded-2xl border border-ink/10 bg-white p-6 hover:border-clay/40" href={`/admin/availability/${person.id}`}><div className="flex items-start justify-between gap-4"><div><p className="font-display text-2xl">{person.name}</p><p className="mt-1 text-sm text-ink/50">{person.email}</p></div><span className={`text-xs font-bold uppercase ${person.status === "ACTIVE" ? "text-forest" : "text-clay"}`}>{person.status}</span></div><p className="mt-5 text-sm text-ink/55">{person._count.availabilityRules} windows · {person._count.blockedTimes} blocked periods</p></Link></li>)}</ul>}
  </div></main>;
}


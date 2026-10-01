import Link from "next/link";
import { requireAdmin } from "@/server/auth/access";
import { listManagedStaff } from "@/server/management/management-service";

export const metadata = { title: "Staff" };
export default async function StaffPage() {
  const actor = await requireAdmin(); const staff = await listManagedStaff(actor);
  return <main className="px-6 py-10 sm:px-10 sm:py-14"><div className="mx-auto max-w-6xl"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-clay">Team</p><h1 className="mt-4 font-display text-5xl sm:text-6xl">Staff</h1></div><Link className="inline-flex min-h-11 items-center rounded-full bg-ink px-6 font-semibold text-cream" href="/admin/staff/new">New staff account</Link></div>
  {staff.length === 0 ? <p className="mt-10 rounded-2xl border border-ink/10 bg-white p-7">No staff accounts yet.</p> : <ul className="mt-8 space-y-3">{staff.map((person) => <li key={person.id}><Link className="grid gap-3 rounded-2xl border border-ink/10 bg-white p-5 hover:border-clay/40 sm:grid-cols-[1.2fr_1fr_auto] sm:items-center" href={`/admin/staff/${person.id}`}><div><p className="font-display text-2xl">{person.name}</p><p className="text-sm text-ink/50">{person.email}</p></div><p className="text-sm text-ink/60">{person._count.staffServices} assigned services</p><div className="text-xs font-bold uppercase"><span>{person.role}</span> · <span className={person.status === "ACTIVE" ? "text-forest" : "text-clay"}>{person.status}</span></div></Link></li>)}</ul>}
  </div></main>;
}


import Link from "next/link";
import { requireAdmin } from "@/server/auth/access";
import { listManagedStaff } from "@/server/management/management-service";

export const metadata = { title: "Staff" };
export default async function StaffPage() {
  const actor = await requireAdmin(); const staff = await listManagedStaff(actor);
  return <main className="admin-main"><div className="mx-auto max-w-6xl"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="admin-eyebrow">Team</p><h1 className="mt-4 font-display text-5xl sm:text-6xl">Staff</h1></div><Link className="admin-button-primary" href="/admin/staff/new">New staff account</Link></div>
  {staff.length === 0 ? <div className="admin-surface mt-8 p-7"><h2 className="font-display text-3xl">No staff accounts yet</h2><p className="mt-2 text-sm text-ink/60">Add a professional to assign services and manage schedules.</p></div> : <ul className="mt-8 space-y-3">{staff.map((person) => <li key={person.id}><Link className="admin-surface grid gap-3 p-5 transition hover:border-clay/40 sm:grid-cols-[1.2fr_1fr_auto] sm:items-center" href={`/admin/staff/${person.id}`}><div><p className="font-display text-2xl">{person.name}</p><p className="text-sm text-ink/50">{person.email}</p></div><p className="text-sm text-ink/60">{person._count.staffServices} assigned services</p><div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase"><span>{person.role}</span><span aria-hidden="true">·</span><span className="admin-status" data-status={person.status}>{person.status}</span></div></Link></li>)}</ul>}
  </div></main>;
}


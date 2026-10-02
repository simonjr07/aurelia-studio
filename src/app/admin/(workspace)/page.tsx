import { requireStaff } from "@/server/auth/access";
import Link from "next/link";

import { StatusBadge } from "@/components/admin/status-badge";
import { formatAppointmentDateTime } from "@/lib/appointment-display";
import { getAppointmentOverview } from "@/server/appointments/appointment-queries";

export default async function WorkspaceOverviewPage() {
  const user = await requireStaff();
  const overview = await getAppointmentOverview(user);

  return (
    <main className="admin-main">
      <div className="mx-auto max-w-6xl">
        <p className="admin-eyebrow">
          Aurelia Studio workspace
        </p>
        <h1 className="mt-4 font-display text-5xl tracking-[-0.035em] sm:text-6xl">
          Welcome, {user.name.split(" ")[0]}.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-ink/60">
          Your operational view of today and the schedule ahead.
        </p>

        <section aria-label="Appointment overview" className="mt-10 grid gap-3 sm:grid-cols-2">
          <Link className="admin-surface group p-5 transition hover:-translate-y-0.5 hover:border-clay/35 sm:p-7" href="/admin/appointments?view=today"><p className="text-sm font-semibold text-ink/55">Today</p><p className="mt-2 font-display text-5xl">{overview.todayCount}</p><p className="mt-3 text-xs font-semibold text-clay">View today’s appointments →</p></Link>
          <Link className="admin-surface group p-5 transition hover:-translate-y-0.5 hover:border-clay/35 sm:p-7" href="/admin/appointments?view=upcoming"><p className="text-sm font-semibold text-ink/55">Upcoming</p><p className="mt-2 font-display text-5xl">{overview.upcomingCount}</p><p className="mt-3 text-xs font-semibold text-clay">View the forward schedule →</p></Link>
        </section>
        <section className="admin-surface mt-6 p-5 sm:p-8">
          <h2 className="font-display text-3xl">Next appointment</h2>
          {overview.nextAppointment ? <Link className="mt-5 grid gap-3 rounded-xl border border-ink/10 bg-cream p-4 transition hover:border-clay/35 sm:grid-cols-[1fr_auto] sm:items-center" href={`/admin/appointments/${overview.nextAppointment.id}`}><div><p className="font-semibold">{overview.nextAppointment.serviceNameSnapshot}</p><p className="mt-1 text-sm text-ink/55">{overview.nextAppointment.customerName} · {formatAppointmentDateTime(overview.nextAppointment.startAt, overview.nextAppointment.timezoneSnapshot)}</p></div><StatusBadge status={overview.nextAppointment.status} /></Link> : <p className="mt-4 rounded-xl bg-cream p-4 text-sm text-ink/60">No future appointments are scheduled.</p>}
          {user.role === "ADMIN" && overview.statusGroups.length > 0 ? <div className="mt-6 flex flex-wrap gap-2 border-t border-ink/10 pt-5">{overview.statusGroups.map((group) => <span className="rounded-full bg-sage/15 px-3 py-2 text-xs font-semibold" key={group.status}>{group.status}: {group._count._all}</span>)}</div> : null}
        </section>
      </div>
    </main>
  );
}

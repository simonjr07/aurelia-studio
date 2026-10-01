import { requireStaff } from "@/server/auth/access";
import Link from "next/link";

import { StatusBadge } from "@/components/admin/status-badge";
import { formatAppointmentDateTime } from "@/lib/appointment-display";
import { getAppointmentOverview } from "@/server/appointments/appointment-queries";

export default async function WorkspaceOverviewPage() {
  const user = await requireStaff();
  const overview = await getAppointmentOverview(user);

  return (
    <main className="px-6 py-10 sm:px-10 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-clay">
          Aurelia Studio workspace
        </p>
        <h1 className="mt-4 font-display text-5xl tracking-[-0.035em] sm:text-6xl">
          Welcome, {user.name.split(" ")[0]}.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-ink/60">
          Your operational view of today and the schedule ahead.
        </p>

        <section className="mt-12 grid gap-4 sm:grid-cols-2">
          <Link className="rounded-[2rem] border border-ink/10 bg-white p-7" href="/admin/appointments?view=today"><p className="text-sm text-ink/50">Today</p><p className="mt-2 font-display text-5xl">{overview.todayCount}</p></Link>
          <Link className="rounded-[2rem] border border-ink/10 bg-white p-7" href="/admin/appointments?view=upcoming"><p className="text-sm text-ink/50">Upcoming</p><p className="mt-2 font-display text-5xl">{overview.upcomingCount}</p></Link>
        </section>
        <section className="mt-6 rounded-[2rem] border border-ink/10 bg-white p-7 sm:p-9">
          <h2 className="font-display text-3xl">Next appointment</h2>
          {overview.nextAppointment ? <Link className="mt-5 grid gap-3 rounded-2xl bg-cream p-5 sm:grid-cols-[1fr_auto]" href={`/admin/appointments/${overview.nextAppointment.id}`}><div><p className="font-semibold">{overview.nextAppointment.serviceNameSnapshot}</p><p className="mt-1 text-sm text-ink/55">{overview.nextAppointment.customerName} · {formatAppointmentDateTime(overview.nextAppointment.startAt, overview.nextAppointment.timezoneSnapshot)}</p></div><StatusBadge status={overview.nextAppointment.status} /></Link> : <p className="mt-4 text-ink/55">No future appointments.</p>}
          {user.role === "ADMIN" && overview.statusGroups.length > 0 ? <div className="mt-6 flex flex-wrap gap-2 border-t border-ink/10 pt-5">{overview.statusGroups.map((group) => <span className="rounded-full bg-sage/15 px-3 py-2 text-xs font-semibold" key={group.status}>{group.status}: {group._count._all}</span>)}</div> : null}
        </section>
      </div>
    </main>
  );
}

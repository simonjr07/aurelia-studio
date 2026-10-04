import { DateTime } from "luxon";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { requireAdmin } from "@/server/auth/access";
import { AnalyticsRangeError } from "@/server/analytics/analytics-range";
import { getDashboardAnalytics } from "@/server/analytics/dashboard-analytics";

export const metadata: Metadata = {
  title: "Analytics",
  description: "Operational appointment analytics for Aurelia Studio administrators.",
};
export const dynamic = "force-dynamic";
export const revalidate = 0;

type AnalyticsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const statusLabels = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No show",
} as const;

const statusStyles = {
  PENDING: "bg-gold",
  CONFIRMED: "bg-sage",
  COMPLETED: "bg-ink",
  CANCELLED: "bg-clay",
  NO_SHOW: "bg-ink/35",
} as const;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatRangeDate(value: string) {
  return DateTime.fromISO(value).toLocaleString({ month: "short", day: "numeric", year: "numeric" });
}

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${remainder} min`;
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  await connection();
  const actor = await requireAdmin();
  const query = await searchParams;
  const filter = { range: first(query.range), start: first(query.start), end: first(query.end) };

  let filterError = "";
  let analytics;
  try {
    analytics = await getDashboardAnalytics(actor, filter);
  } catch (error) {
    if (!(error instanceof AnalyticsRangeError)) throw error;
    filterError = error.message;
    analytics = await getDashboardAnalytics(actor, { range: "30d" });
  }

  const { range, summary, statusBreakdown, trend, popularServices, staffWorkload } = analytics;
  const maxTrend = Math.max(1, ...trend.map((item) => item.count));
  const metrics = [
    ["Total bookings", summary.total],
    ["Pending", summary.PENDING],
    ["Confirmed", summary.CONFIRMED],
    ["Completed", summary.COMPLETED],
    ["Cancelled", summary.CANCELLED],
    ["No shows", summary.NO_SHOW],
  ] as const;

  return (
    <main className="admin-main">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 border-b border-ink/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="admin-eyebrow">Operational analytics</p>
            <h1 className="mt-3 font-display text-5xl tracking-[-0.035em] sm:text-6xl">Studio activity</h1>
            <p className="mt-4 max-w-2xl leading-7 text-ink/60">
              Appointment date activity from {formatRangeDate(range.startDate)} through {formatRangeDate(range.endDate)}, using {range.timezone} calendar boundaries.
            </p>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Analytics range presets">
            {(["7d", "30d", "90d"] as const).map((preset) => (
              <Link
                aria-current={range.preset === preset ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold ${range.preset === preset ? "border-ink bg-ink text-cream" : "border-ink/15 bg-white hover:border-ink/35"}`}
                href={`/admin/analytics?range=${preset}`}
                key={preset}
              >
                Last {preset.replace("d", " days")}
              </Link>
            ))}
          </div>
        </div>

        <form className="admin-surface mt-6 grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end" method="get">
          <label className="text-sm font-semibold">Start date<input className="admin-field mt-2" defaultValue={range.preset === "custom" ? range.startDate : ""} name="start" required type="date" /></label>
          <label className="text-sm font-semibold">End date<input className="admin-field mt-2" defaultValue={range.preset === "custom" ? range.endDate : ""} name="end" required type="date" /></label>
          <button className="admin-button-primary" type="submit">Apply custom range</button>
          <p className="text-xs leading-5 text-ink/45 sm:ml-auto sm:max-w-xs">Maximum 365 days. Dates use the studio timezone, not your device timezone.</p>
        </form>
        {filterError ? <p className="mt-4 rounded-xl border border-clay/20 bg-clay/10 p-4 text-sm font-semibold text-clay" role="alert">{filterError} Showing the last 30 days instead.</p> : null}

        <section aria-labelledby="summary-heading" className="mt-8">
          <h2 className="sr-only" id="summary-heading">Booking summary</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {metrics.map(([label, value], index) => (
              <article className={`admin-surface p-4 sm:p-5 ${index === 0 ? "sm:col-span-2 xl:col-span-1" : ""}`} key={label}>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/45">{label}</p>
                <p className="mt-3 font-display text-4xl">{value}</p>
              </article>
            ))}
          </div>
        </section>

        {summary.total === 0 ? (
          <section className="admin-surface mt-8 px-6 py-16 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-clay">No activity</p>
            <h2 className="mt-4 font-display text-4xl">No appointments were scheduled in this period.</h2>
            <p className="mx-auto mt-4 max-w-xl leading-7 text-ink/55">Try a wider preset or choose another custom date range.</p>
          </section>
        ) : (
          <>
            <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_0.8fr]">
              <section aria-labelledby="trend-heading" className="admin-surface min-w-0 p-5 sm:p-7">
                <div className="flex items-end justify-between gap-4">
                  <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">By appointment date</p><h2 className="mt-2 font-display text-3xl" id="trend-heading">Booking trend</h2></div>
                  <p className="text-sm text-ink/45">Daily count</p>
                </div>
                <div className="mt-8 overflow-x-auto pb-2">
                  <ol className="flex h-56 items-end gap-1" style={{ minWidth: `${Math.max(560, trend.length * 12)}px` }}>
                    {trend.map((item) => (
                      <li className="group relative flex h-full min-w-1 flex-1 items-end" key={item.date}>
                        <span className="sr-only">{item.date}: {item.count} bookings</span>
                        <span aria-hidden="true" className="w-full min-h-1 rounded-t bg-sage transition group-hover:bg-clay" style={{ height: `${Math.max(2, (item.count / maxTrend) * 100)}%` }} />
                      </li>
                    ))}
                  </ol>
                  <div className="mt-3 flex justify-between text-xs text-ink/45"><span>{formatRangeDate(range.startDate)}</span><span>{formatRangeDate(range.endDate)}</span></div>
                </div>
              </section>

              <section aria-labelledby="status-heading" className="admin-surface p-5 sm:p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">Current booking status</p>
                <h2 className="mt-2 font-display text-3xl" id="status-heading">Status breakdown</h2>
                <ul className="mt-7 space-y-5">
                  {statusBreakdown.map((item) => (
                    <li key={item.status}>
                      <div className="flex items-center justify-between gap-3 text-sm"><span className="font-semibold">{statusLabels[item.status]}</span><span>{item.count} · {item.percentage}%</span></div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/8"><div className={`h-full rounded-full ${statusStyles[item.status]}`} style={{ width: `${item.percentage}%` }} /></div>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <section aria-labelledby="services-heading" className="admin-surface p-5 sm:p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">All booking statuses</p>
                <h2 className="mt-2 font-display text-3xl" id="services-heading">Popular services</h2>
                <ol className="mt-7 divide-y divide-ink/10">
                  {popularServices.map((service, index) => (
                    <li className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 py-4" key={service.serviceId}>
                      <span className="text-sm font-semibold text-clay">{String(index + 1).padStart(2, "0")}</span>
                      <div><p className="font-semibold">{service.serviceName}</p><p className="mt-1 text-xs text-ink/45">{formatMinutes(service.scheduledMinutes)} scheduled</p></div>
                      <p className="text-right"><span className="block font-display text-2xl">{service.bookingCount}</span><span className="text-xs text-ink/45">bookings</span></p>
                    </li>
                  ))}
                </ol>
              </section>

              <section aria-labelledby="workload-heading" className="admin-surface p-5 sm:p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">Excludes cancelled bookings</p>
                <h2 className="mt-2 font-display text-3xl" id="workload-heading">Staff workload</h2>
                <p className="mt-2 text-sm leading-6 text-ink/50">Scheduled minutes are workload, not a utilization percentage.</p>
                <ol className="mt-5 divide-y divide-ink/10">
                  {staffWorkload.map((staff, index) => (
                    <li className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 py-4" key={staff.staffId}>
                      <span className="text-sm font-semibold text-clay">{String(index + 1).padStart(2, "0")}</span>
                      <div><p className="font-semibold">{staff.staffName}</p><p className="mt-1 text-xs text-ink/45">{staff.appointmentCount} appointments</p></div>
                      <p className="text-right font-semibold">{formatMinutes(staff.scheduledMinutes)}</p>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          </>
        )}

        <p className="mt-8 text-xs leading-5 text-ink/45">Analytics use each booking’s current status and appointment start date. They do not represent booking-created volume, payment, or revenue.</p>
      </div>
    </main>
  );
}

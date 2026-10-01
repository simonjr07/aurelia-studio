import Link from "next/link";

import { StatusBadge } from "@/components/admin/status-badge";
import { formatAppointmentDateTime } from "@/lib/appointment-display";
import { formatDuration } from "@/lib/formatters";
import { requireStaff } from "@/server/auth/access";
import { getAppointments } from "@/server/appointments/appointment-queries";

export const metadata = { title: "Appointments" };

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const actor = await requireStaff();
  const view = (await searchParams).view === "upcoming" ? "upcoming" : "today";
  const { appointments } = await getAppointments(actor, view);

  return (
    <main className="px-6 py-10 sm:px-10 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-clay">
          Operations
        </p>
        <h1 className="mt-4 font-display text-5xl tracking-[-0.035em] sm:text-6xl">
          Appointments
        </h1>
        <div className="mt-8 flex gap-2" role="navigation" aria-label="Appointment views">
          {(["today", "upcoming"] as const).map((item) => (
            <Link
              aria-current={view === item ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold ${view === item ? "bg-ink text-cream" : "border border-ink/15"}`}
              href={`/admin/appointments?view=${item}`}
              key={item}
            >
              {item === "today" ? "Today" : "Upcoming"}
            </Link>
          ))}
        </div>

        {appointments.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-ink/10 bg-white p-7 text-ink/60">
            No {view} appointments.
          </p>
        ) : (
          <ul className="mt-8 space-y-3">
            {appointments.map((appointment) => (
              <li key={appointment.id}>
                <Link
                  className="grid gap-4 rounded-2xl border border-ink/10 bg-white p-5 transition hover:border-clay/40 sm:grid-cols-[1.2fr_1fr_auto] sm:items-center"
                  href={`/admin/appointments/${appointment.id}`}
                >
                  <div>
                    <p className="font-display text-2xl">{appointment.serviceNameSnapshot}</p>
                    <p className="mt-1 text-sm text-ink/55">{appointment.customerName}</p>
                  </div>
                  <div className="text-sm leading-6">
                    <p className="font-semibold">
                      {formatAppointmentDateTime(appointment.startAt, appointment.timezoneSnapshot)}
                    </p>
                    <p className="text-ink/55">
                      {appointment.staff.name} · {formatDuration(appointment.serviceDurationSnapshot)}
                    </p>
                  </div>
                  <StatusBadge status={appointment.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}


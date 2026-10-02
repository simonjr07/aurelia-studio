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
    <main className="admin-main">
      <div className="mx-auto max-w-6xl">
        <p className="admin-eyebrow">
          Operations
        </p>
        <h1 className="mt-4 font-display text-5xl tracking-[-0.035em] sm:text-6xl">
          Appointments
        </h1>
        <div className="mt-7 flex flex-wrap gap-2" role="navigation" aria-label="Appointment views">
          {(["today", "upcoming"] as const).map((item) => (
            <Link
              aria-current={view === item ? "page" : undefined}
              className={view === item ? "admin-button-primary" : "admin-button-secondary"}
              href={`/admin/appointments?view=${item}`}
              key={item}
            >
              {item === "today" ? "Today" : "Upcoming"}
            </Link>
          ))}
        </div>

        {appointments.length === 0 ? (
          <div className="admin-surface mt-8 p-8"><p className="admin-eyebrow">Nothing scheduled</p><h2 className="mt-3 font-display text-3xl">No {view} appointments</h2><p className="mt-3 max-w-xl text-sm leading-6 text-ink/60">This is a normal quiet period. New public bookings and schedule changes will appear here automatically.</p></div>
        ) : (
          <ul className="mt-8 space-y-3">
            {appointments.map((appointment) => (
              <li key={appointment.id}>
                <Link
                  className="admin-surface grid gap-4 p-4 transition hover:border-clay/40 sm:grid-cols-[1.2fr_1fr_auto] sm:items-center sm:p-5"
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


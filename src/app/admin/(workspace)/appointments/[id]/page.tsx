import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusBadge } from "@/components/admin/status-badge";
import { formatAppointmentDateTime } from "@/lib/appointment-display";
import { formatDuration, formatPrice } from "@/lib/formatters";
import { getAppointment } from "@/server/appointments/appointment-queries";
import { bookingStatusLabels } from "@/server/appointments/status-transitions";
import { requireStaff } from "@/server/auth/access";

import { StatusActions } from "./status-actions";
import { RescheduleActions } from "./reschedule-actions";

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireStaff();
  const { id } = await params;
  const appointment = await getAppointment(actor, id);
  if (!appointment) notFound();

  return (
    <main className="admin-main">
      <div className="mx-auto max-w-5xl">
        <Link className="text-sm font-semibold underline underline-offset-4" href="/admin/appointments">
          ← Appointments
        </Link>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="admin-eyebrow">Appointment detail</p>
            <h1 className="mt-3 font-display text-5xl">{appointment.serviceNameSnapshot}</h1>
          </div>
          <StatusBadge status={appointment.status} />
        </div>

        <section className="admin-surface mt-8 p-5 sm:p-8">
          <dl className="grid gap-6 sm:grid-cols-2">
            <div><dt className="text-sm text-ink/50">Booking reference</dt><dd className="mt-1 font-mono font-bold">{appointment.publicReference}</dd></div>
            <div><dt className="text-sm text-ink/50">Professional</dt><dd className="mt-1 font-semibold">{appointment.staff.name}</dd></div>
            <div><dt className="text-sm text-ink/50">Date and time</dt><dd className="mt-1 font-semibold">{formatAppointmentDateTime(appointment.startAt, appointment.timezoneSnapshot)}</dd><dd className="text-sm text-ink/50">{appointment.timezoneSnapshot}</dd></div>
            <div><dt className="text-sm text-ink/50">Duration and price</dt><dd className="mt-1 font-semibold">{formatDuration(appointment.serviceDurationSnapshot)} · {formatPrice(appointment.priceCentsSnapshot, appointment.currencySnapshot)}</dd></div>
            <div><dt className="text-sm text-ink/50">Customer</dt><dd className="mt-1 font-semibold">{appointment.customerName}</dd></div>
            <div><dt className="text-sm text-ink/50">Contact</dt><dd className="mt-1"><a href={`mailto:${appointment.customerEmail}`}>{appointment.customerEmail}</a><br /><a href={`tel:${appointment.customerPhone}`}>{appointment.customerPhone}</a></dd></div>
            {appointment.customerNote ? <div className="sm:col-span-2"><dt className="text-sm text-ink/50">Customer note</dt><dd className="mt-2 whitespace-pre-wrap rounded-xl bg-cream p-4">{appointment.customerNote}</dd></div> : null}
          </dl>
        </section>

        {appointment.status === "PENDING" || appointment.status === "CONFIRMED" ? <section className="admin-surface mt-8 p-5 sm:p-8"><h2 className="font-display text-3xl">Reschedule</h2><p className="mt-2 text-sm text-ink/55">Internal rescheduling is not subject to the customer cutoff. Availability is revalidated transactionally.</p><div className="mt-6"><RescheduleActions bookingId={appointment.id} currentStaffId={appointment.staff.id} role={actor.role} serviceSlug={appointment.service.slug} startAt={appointment.startAt.toISOString()} status={appointment.status} /></div></section> : null}

        <section className="admin-surface mt-8 p-5 sm:p-8">
          <h2 className="font-display text-3xl">Update status</h2>
          <div className="mt-6"><StatusActions bookingId={appointment.id} status={appointment.status} /></div>
        </section>

        <section className="admin-surface mt-8 p-5 sm:p-8"><h2 className="font-display text-3xl">Reschedule history</h2>{appointment.rescheduleEvents.length === 0 ? <p className="mt-4 rounded-xl bg-cream p-4 text-sm text-ink/55">No reschedules recorded.</p> : <ol className="mt-6 space-y-5 border-l border-ink/15 pl-6">{appointment.rescheduleEvents.map((event) => <li key={event.id}><p className="font-semibold">{formatAppointmentDateTime(event.fromStartAt, appointment.timezoneSnapshot)} → {formatAppointmentDateTime(event.toStartAt, appointment.timezoneSnapshot)}</p><p className="mt-1 text-sm text-ink/55">Changed {formatAppointmentDateTime(event.createdAt, appointment.timezoneSnapshot)} · {event.changedByUser?.name ?? "Customer / system"}</p>{event.note ? <p className="mt-2 text-sm">{event.note}</p> : null}</li>)}</ol>}</section>

        <section className="admin-surface mt-8 p-5 sm:p-8">
          <h2 className="font-display text-3xl">Status history</h2>
          <ol className="mt-6 space-y-5 border-l border-ink/15 pl-6">
            {appointment.statusEvents.map((event) => (
              <li key={event.id}>
                <p className="font-semibold">
                  {event.fromStatus ? bookingStatusLabels[event.fromStatus] : "Created"} → {bookingStatusLabels[event.toStatus]}
                </p>
                <p className="mt-1 text-sm text-ink/55">
                  {formatAppointmentDateTime(event.createdAt, appointment.timezoneSnapshot)} · {event.changedByUser?.name ?? "Customer / system"}
                </p>
                {event.note ? <p className="mt-2 whitespace-pre-wrap text-sm">{event.note}</p> : null}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}


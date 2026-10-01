"use client";

import Link from "next/link";
import { useState } from "react";

import { formatDuration, formatPrice } from "@/lib/formatters";

type PublicBookingDetail = {
  reference: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  statusLabel: string;
  serviceName: string;
  staffName: string;
  startAt: string;
  endAt: string;
  timezone: string;
  durationMinutes: number;
  priceCents: number;
  currency: string;
  customerName: string;
  serviceSlug: string;
  staffId: string;
  cancellationCutoffMinutes: number;
  rescheduleCutoffMinutes: number;
  canCancel: boolean;
  canReschedule: boolean;
  cancellationCutoffAt: string;
  rescheduleCutoffAt: string;
};

type AvailabilitySlot = { startAt: string; localTimeLabel: string; eligibleStaff: Array<{ id: string; name: string }> };

type LookupFieldErrors = Partial<Record<"reference" | "email", string[]>>;

function studioDate(iso: string, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function studioTime(iso: string, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function ManageBooking() {
  const [reference, setReference] = useState("");
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<LookupFieldErrors>({});
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [booking, setBooking] = useState<PublicBookingDetail | null>(null);
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [mode, setMode] = useState<"cancel" | "reschedule" | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleStaff, setRescheduleStaff] = useState("");
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedStartAt, setSelectedStartAt] = useState("");

  async function submitLookup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setError("");
    setFieldErrors({});

    try {
      const response = await fetch("/api/bookings/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ reference, email }),
      });
      const body = await response.json();

      if (response.status === 400 && body.fieldErrors) {
        setFieldErrors(body.fieldErrors);
        setError(body.error);
        return;
      }

      if (!response.ok) {
        setError(body.error || "Booking lookup is temporarily unavailable.");
        return;
      }

      setBooking(body);
      setVerifiedEmail(email.trim().toLowerCase());
      setReference("");
      setEmail("");
    } catch {
      setError("Booking lookup is temporarily unavailable.");
    } finally {
      setPending(false);
    }
  }

  function resetLookup() {
    setBooking(null);
    setError("");
    setFieldErrors({});
    setMode(null);
  }

  async function refreshVerifiedBooking(current: PublicBookingDetail) {
    const response = await fetch("/api/bookings/lookup", { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify({ reference: current.reference, email: verifiedEmail }) });
    if (response.ok) setBooking(await response.json());
  }

  async function cancelBooking() {
    if (!booking || pending) return; setPending(true); setError("");
    try {
      const response = await fetch("/api/bookings/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference: booking.reference, email: verifiedEmail, expectedStatus: booking.status, expectedStartAt: booking.startAt }) });
      const body = await response.json(); if (!response.ok) return setError(body.error || "Cancellation is temporarily unavailable.");
      await refreshVerifiedBooking(booking); setMode(null);
    } catch { setError("Cancellation is temporarily unavailable."); } finally { setPending(false); }
  }

  async function loadSlots() {
    if (!booking || !rescheduleDate || pending) return; setPending(true); setError(""); setSelectedStartAt("");
    try {
      const staff = rescheduleStaff ? `&staff=${encodeURIComponent(rescheduleStaff)}` : "";
      const response = await fetch(`/api/availability?service=${encodeURIComponent(booking.serviceSlug)}&date=${rescheduleDate}${staff}`, { cache: "no-store" });
      const body = await response.json(); if (!response.ok) return setError(body.error || "Availability is temporarily unavailable."); setSlots(body.slots);
    } catch { setError("Availability is temporarily unavailable."); } finally { setPending(false); }
  }

  async function confirmReschedule() {
    if (!booking || !selectedStartAt || pending) return; setPending(true); setError("");
    try {
      const response = await fetch("/api/bookings/reschedule", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference: booking.reference, email: verifiedEmail, expectedStatus: booking.status, expectedStartAt: booking.startAt, startAt: selectedStartAt, ...(rescheduleStaff ? { staffId: rescheduleStaff } : {}) }) });
      const body = await response.json(); if (!response.ok) return setError(body.error || "Rescheduling is temporarily unavailable.");
      await refreshVerifiedBooking(booking); setMode(null); setSlots([]); setSelectedStartAt("");
    } catch { setError("Rescheduling is temporarily unavailable."); } finally { setPending(false); }
  }

  if (booking) {
    return (
      <section className="mx-auto w-full max-w-5xl px-6 py-14 sm:px-10 sm:py-20">
        <div className="overflow-hidden rounded-[2.5rem] border border-ink/10 bg-white/65 shadow-xl shadow-ink/5">
          <div className="flex flex-col gap-5 bg-sage p-7 text-cream sm:flex-row sm:items-end sm:justify-between sm:p-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cream/70">
                Verified booking
              </p>
              <h2 className="mt-3 font-display text-4xl sm:text-5xl">
                {booking.serviceName}
              </h2>
            </div>
            <span className="w-fit rounded-full border border-cream/35 px-4 py-2 text-sm font-bold">
              {booking.statusLabel}
            </span>
          </div>

          <div className="p-7 sm:p-10">
            <p className="text-sm text-ink/50">Booking reference</p>
            <p className="mt-2 select-all font-mono text-2xl font-bold tracking-wider sm:text-3xl">
              {booking.reference}
            </p>

            <dl className="mt-8 grid gap-x-10 gap-y-6 border-y border-ink/10 py-8 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-ink/50">Guest</dt>
                <dd className="mt-1 font-semibold">{booking.customerName}</dd>
              </div>
              <div>
                <dt className="text-sm text-ink/50">Professional</dt>
                <dd className="mt-1 font-semibold">{booking.staffName}</dd>
              </div>
              <div>
                <dt className="text-sm text-ink/50">Date</dt>
                <dd className="mt-1 font-semibold">
                  {studioDate(booking.startAt, booking.timezone)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-ink/50">Time</dt>
                <dd className="mt-1 font-semibold">
                  {studioTime(booking.startAt, booking.timezone)} · {booking.timezone}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-ink/50">Duration</dt>
                <dd className="mt-1 font-semibold">
                  {formatDuration(booking.durationMinutes)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-ink/50">Price</dt>
                <dd className="mt-1 font-semibold">
                  {formatPrice(booking.priceCents, booking.currency)}
                </dd>
              </div>
            </dl>

            <div className="mt-7 rounded-2xl bg-cream p-5 text-sm leading-6 text-ink/60">
              <p>Online cancellation is available until {studioTime(booking.cancellationCutoffAt, booking.timezone)} on {studioDate(booking.cancellationCutoffAt, booking.timezone)} ({booking.cancellationCutoffMinutes} minutes before the appointment).</p>
              <p className="mt-2">Online rescheduling is available until {studioTime(booking.rescheduleCutoffAt, booking.timezone)} on {studioDate(booking.rescheduleCutoffAt, booking.timezone)} ({booking.rescheduleCutoffMinutes} minutes before the appointment).</p>
            </div>
            {error ? <p className="mt-5 rounded-xl bg-clay/10 p-4 text-sm font-semibold text-clay" role="alert">{error}</p> : null}
            {mode === "cancel" ? <section className="mt-6 rounded-2xl border border-clay/30 p-5"><h3 className="font-display text-2xl">Cancel this booking?</h3><p className="mt-3 text-sm leading-6">This will cancel {booking.serviceName} on {studioDate(booking.startAt, booking.timezone)} at {studioTime(booking.startAt, booking.timezone)}. Reference {booking.reference} will remain available for your records.</p><div className="mt-5 flex gap-3"><button className="min-h-11 rounded-full bg-clay px-5 font-semibold text-white disabled:opacity-50" disabled={pending} onClick={cancelBooking} type="button">{pending ? "Cancelling…" : "Confirm cancellation"}</button><button className="min-h-11 rounded-full border border-ink/20 px-5 font-semibold" onClick={() => setMode(null)} type="button">Keep booking</button></div></section> : null}
            {mode === "reschedule" ? <section className="mt-6 rounded-2xl border border-ink/15 p-5"><h3 className="font-display text-2xl">Choose a new time</h3><div className="mt-4 grid gap-3 sm:grid-cols-3"><label className="text-sm font-semibold">New date<input className="mt-2 min-h-11 w-full rounded-xl border border-ink/20 px-3" onChange={(event) => setRescheduleDate(event.target.value)} type="date" value={rescheduleDate} /></label><label className="text-sm font-semibold">Professional<select className="mt-2 min-h-11 w-full rounded-xl border border-ink/20 px-3" onChange={(event) => setRescheduleStaff(event.target.value)} value={rescheduleStaff}><option value="">Any available</option><option value={booking.staffId}>Keep {booking.staffName}</option></select></label><button className="mt-6 min-h-11 rounded-full bg-ink px-5 font-semibold text-cream disabled:opacity-50" disabled={!rescheduleDate || pending} onClick={loadSlots} type="button">{pending ? "Checking…" : "Check times"}</button></div>{slots.length > 0 ? <div className="mt-5 flex flex-wrap gap-2">{slots.map((slot) => <button className={`min-h-11 rounded-full border px-4 text-sm font-semibold ${selectedStartAt === slot.startAt ? "bg-sage text-cream" : "border-ink/20"}`} key={slot.startAt} onClick={() => setSelectedStartAt(slot.startAt)} type="button">{slot.localTimeLabel}</button>)}</div> : null}{selectedStartAt ? <div className="mt-6 rounded-xl bg-cream p-4"><p className="font-semibold">Review: {studioDate(booking.startAt, booking.timezone)} {studioTime(booking.startAt, booking.timezone)} → {studioDate(selectedStartAt, booking.timezone)} {studioTime(selectedStartAt, booking.timezone)}</p><button className="mt-4 min-h-11 rounded-full bg-ink px-5 font-semibold text-cream disabled:opacity-50" disabled={pending} onClick={confirmReschedule} type="button">{pending ? "Rescheduling…" : "Confirm reschedule"}</button></div> : null}</section> : null}
            <div className="mt-8 flex flex-wrap gap-3">
              {booking.canReschedule && !mode ? <button className="min-h-12 rounded-full bg-sage px-7 font-semibold text-cream" onClick={() => setMode("reschedule")} type="button">Reschedule</button> : null}
              {booking.canCancel && !mode ? <button className="min-h-12 rounded-full border border-clay px-7 font-semibold text-clay" onClick={() => setMode("cancel")} type="button">Cancel booking</button> : null}
              {!booking.canCancel && !booking.canReschedule && (booking.status === "PENDING" || booking.status === "CONFIRMED") ? <p className="w-full text-sm text-ink/55">Online changes are no longer available because the policy cutoff has passed.</p> : null}
              <button
                className="min-h-12 rounded-full bg-ink px-7 font-semibold text-cream"
                onClick={resetLookup}
                type="button"
              >
                Look up another booking
              </button>
              <Link
                className="inline-flex min-h-12 items-center rounded-full border border-ink/20 px-7 font-semibold"
                href="/services"
              >
                View services
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-14 sm:px-10 sm:py-20 lg:grid-cols-[1fr_0.72fr]">
      <form
        className="rounded-[2rem] border border-ink/10 bg-white/65 p-6 shadow-xl shadow-ink/5 sm:p-9"
        noValidate
        onSubmit={submitLookup}
      >
        <h2 className="font-display text-4xl">Find your booking</h2>
        <p className="mt-3 leading-7 text-ink/60">
          Both fields must match the details used at checkout.
        </p>

        {error ? (
          <p
            aria-live="polite"
            className="mt-6 rounded-xl bg-clay/10 p-4 text-sm font-semibold text-clay"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-7 space-y-5">
          <label className="block" htmlFor="booking-reference">
            <span className="font-semibold">Booking reference</span>
            <input
              aria-describedby={fieldErrors.reference ? "reference-error" : undefined}
              aria-invalid={Boolean(fieldErrors.reference)}
              autoComplete="off"
              className="mt-2 min-h-12 w-full rounded-xl border border-ink/20 bg-white px-4 font-mono uppercase"
              id="booking-reference"
              maxLength={32}
              onChange={(event) => {
                setReference(event.target.value);
                setFieldErrors((current) => ({ ...current, reference: undefined }));
              }}
              placeholder="AUR-…"
              required
              value={reference}
            />
            {fieldErrors.reference?.map((message) => (
              <span className="mt-1 block text-sm text-clay" id="reference-error" key={message}>
                {message}
              </span>
            ))}
          </label>

          <label className="block" htmlFor="booking-email">
            <span className="font-semibold">Email used to book</span>
            <input
              aria-describedby={fieldErrors.email ? "email-error" : undefined}
              aria-invalid={Boolean(fieldErrors.email)}
              autoComplete="email"
              className="mt-2 min-h-12 w-full rounded-xl border border-ink/20 bg-white px-4"
              id="booking-email"
              maxLength={320}
              onChange={(event) => {
                setEmail(event.target.value);
                setFieldErrors((current) => ({ ...current, email: undefined }));
              }}
              required
              type="email"
              value={email}
            />
            {fieldErrors.email?.map((message) => (
              <span className="mt-1 block text-sm text-clay" id="email-error" key={message}>
                {message}
              </span>
            ))}
          </label>
        </div>

        <button
          className="mt-8 min-h-12 w-full rounded-full bg-ink px-7 font-semibold text-cream disabled:cursor-wait disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "Verifying…" : "Find booking"}
        </button>
      </form>

      <aside className="h-fit rounded-[2rem] bg-sage p-7 text-cream sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cream/70">
          Private by design
        </p>
        <h2 className="mt-4 font-display text-3xl">Two details, one secure view.</h2>
        <p className="mt-5 leading-7 text-cream/80">
          We require both your non-sequential reference and booking email. Your
          email is sent only in this secure POST request and never appears in
          the page address.
        </p>
      </aside>
    </section>
  );
}


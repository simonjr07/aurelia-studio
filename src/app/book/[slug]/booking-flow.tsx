"use client";

import { useEffect, useMemo, useState } from "react";

import { formatDuration, formatPrice } from "@/lib/formatters";
import type { PublicServiceDetail } from "@/server/services/public-service-queries";

type Stage = "staff" | "date" | "time" | "details" | "review" | "confirmed";
type Slot = {
  startAt: string;
  endAt: string;
  localTimeLabel: string;
  eligibleStaff: Array<{ id: string; name: string }>;
};
type Confirmation = {
  reference: string;
  status: "PENDING";
  serviceName: string;
  staffName: string;
  startAt: string;
  endAt: string;
  timezone: string;
  durationMinutes: number;
  priceCents: number;
  currency: string;
};
type FieldErrors = Partial<
  Record<"customerName" | "customerEmail" | "customerPhone" | "customerNote", string[]>
>;

const steps: Array<{ id: Exclude<Stage, "confirmed">; label: string }> = [
  { id: "staff", label: "Staff" },
  { id: "date", label: "Date" },
  { id: "time", label: "Time" },
  { id: "details", label: "Details" },
  { id: "review", label: "Review" },
];

function formatStudioDateTime(iso: string, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
}

export function BookingFlow({
  service,
  timezone,
  initialDate,
  maximumDate,
}: {
  service: PublicServiceDetail;
  timezone: string;
  initialDate: string;
  maximumDate: string;
}) {
  const [stage, setStage] = useState<Stage>("staff");
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState(initialDate);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [details, setDetails] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerNote: "",
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const selectedStaffName = useMemo(
    () => service.eligibleStaff.find((staff) => staff.id === staffId)?.name,
    [service.eligibleStaff, staffId],
  );

  useEffect(() => {
    if (stage !== "time") return;

    const controller = new AbortController();
    const query = new URLSearchParams({ service: service.slug, date });
    if (staffId) query.set("staff", staffId);

    fetch(`/api/availability?${query}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Availability could not be loaded.");
        setSlots(body.slots);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSlots([]);
        setAvailabilityError(
          error instanceof Error ? error.message : "Availability could not be loaded.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingSlots(false);
      });

    return () => controller.abort();
  }, [date, service.slug, staffId, stage]);

  function updateDetail(field: keyof typeof details, value: string) {
    setDetails((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  function openTimeSelection() {
    setLoadingSlots(true);
    setAvailabilityError("");
    setSelectedSlot(null);
    setStage("time");
  }

  function validateDetails() {
    const errors: FieldErrors = {};
    if (!details.customerName.trim()) errors.customerName = ["Enter your name."];
    if (!/^\S+@\S+\.\S+$/.test(details.customerEmail.trim())) {
      errors.customerEmail = ["Enter a valid email address."];
    }
    if (details.customerPhone.trim().length < 7) {
      errors.customerPhone = ["Enter a phone number."];
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function submitBooking() {
    if (!selectedSlot || submitting) return;
    setSubmitting(true);
    setSubmitError("");

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceSlug: service.slug,
          staffId: staffId || undefined,
          startAt: selectedSlot.startAt,
          ...details,
        }),
      });
      const body = await response.json();

      if (response.status === 409) {
        openTimeSelection();
        setSubmitError(body.error);
        return;
      }

      if (response.status === 400 && body.fieldErrors) {
        setFieldErrors(body.fieldErrors);
        setStage("details");
        setSubmitError(body.error);
        return;
      }

      if (!response.ok) throw new Error(body.error || "Booking could not be completed.");

      setConfirmation(body);
      setStage("confirmed");
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Booking could not be completed.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (stage === "confirmed" && confirmation) {
    return (
      <section className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-10 sm:py-24">
        <div className="rounded-[2.5rem] border border-sage/40 bg-white/65 p-7 shadow-xl shadow-ink/5 sm:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-clay">
            Booking received
          </p>
          <h2 className="mt-4 font-display text-5xl">Your visit is pending.</h2>
          <p className="mt-5 leading-7 text-ink/65">
            Keep this reference safe. Booking management using your reference
            will be available in a future update.
          </p>
          <p className="mt-8 select-all rounded-2xl bg-ink px-6 py-5 font-mono text-2xl font-bold tracking-wider text-cream sm:text-3xl">
            {confirmation.reference}
          </p>
          <dl className="mt-8 grid gap-5 border-t border-ink/10 pt-8 sm:grid-cols-2">
            <div><dt className="text-sm text-ink/50">Service</dt><dd className="mt-1 font-semibold">{confirmation.serviceName}</dd></div>
            <div><dt className="text-sm text-ink/50">Professional</dt><dd className="mt-1 font-semibold">{confirmation.staffName}</dd></div>
            <div><dt className="text-sm text-ink/50">Time</dt><dd className="mt-1 font-semibold">{formatStudioDateTime(confirmation.startAt, confirmation.timezone)}</dd></div>
            <div><dt className="text-sm text-ink/50">Status</dt><dd className="mt-1 font-semibold">Pending</dd></div>
            <div><dt className="text-sm text-ink/50">Duration</dt><dd className="mt-1 font-semibold">{formatDuration(confirmation.durationMinutes)}</dd></div>
            <div><dt className="text-sm text-ink/50">Price</dt><dd className="mt-1 font-semibold">{formatPrice(confirmation.priceCents, confirmation.currency)}</dd></div>
          </dl>
        </div>
      </section>
    );
  }

  const activeIndex = steps.findIndex((step) => step.id === stage);

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-12 sm:px-10 sm:py-20">
      <ol aria-label="Booking progress" className="grid grid-cols-5 gap-2">
        {steps.map((step, index) => (
          <li className="min-w-0" key={step.id}>
            <div className={`h-1.5 rounded-full ${index <= activeIndex ? "bg-clay" : "bg-ink/10"}`} />
            <span className={`mt-2 block truncate text-xs ${index === activeIndex ? "font-bold" : "text-ink/45"}`}>
              {step.label}
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="rounded-[2rem] border border-ink/10 bg-white/60 p-6 sm:p-9">
          {submitError ? <p className="mb-6 rounded-xl bg-clay/10 p-4 text-sm font-semibold text-clay" role="alert">{submitError}</p> : null}

          {stage === "staff" ? (
            <fieldset>
              <legend className="font-display text-4xl">Who would you like to see?</legend>
              <p className="mt-3 text-ink/60">Choose a professional or let us assign anyone available.</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {[{ id: "", name: "Any available" }, ...service.eligibleStaff].map((staff) => (
                  <label className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border px-5 font-semibold ${staffId === staff.id ? "border-clay bg-clay/10" : "border-ink/10"}`} key={staff.id || "any"}>
                    <input checked={staffId === staff.id} name="staff" onChange={() => setStaffId(staff.id)} type="radio" />
                    {staff.name}<span className="sr-only">{staffId === staff.id ? " selected" : ""}</span>
                  </label>
                ))}
              </div>
              <button className="mt-8 min-h-12 rounded-full bg-ink px-7 font-semibold text-cream" onClick={() => setStage("date")} type="button">Continue</button>
            </fieldset>
          ) : null}

          {stage === "date" ? (
            <div>
              <h2 className="font-display text-4xl">Choose a date</h2>
              <p className="mt-3 text-ink/60">Dates and times are shown in the studio timezone ({timezone}).</p>
              <label className="mt-8 block max-w-sm font-semibold" htmlFor="booking-date">Appointment date</label>
              <input className="mt-2 min-h-12 w-full max-w-sm rounded-xl border border-ink/20 bg-white px-4" id="booking-date" max={maximumDate} min={initialDate} onChange={(event) => { setDate(event.target.value); setSelectedSlot(null); }} type="date" value={date} />
              <div className="mt-8 flex gap-3"><button className="min-h-12 rounded-full border border-ink/20 px-6 font-semibold" onClick={() => setStage("staff")} type="button">Back</button><button className="min-h-12 rounded-full bg-ink px-7 font-semibold text-cream disabled:opacity-50" disabled={!date} onClick={openTimeSelection} type="button">Find times</button></div>
            </div>
          ) : null}

          {stage === "time" ? (
            <div>
              <h2 className="font-display text-4xl">Choose a time</h2>
              <p className="mt-3 text-ink/60">All times are {timezone}.</p>
              <div aria-live="polite" className="mt-8">
                {loadingSlots ? <p>Loading available times…</p> : null}
                {availabilityError ? <p className="rounded-xl bg-clay/10 p-4 text-clay" role="alert">{availabilityError}</p> : null}
                {!loadingSlots && !availabilityError && slots.length === 0 ? <p className="rounded-xl bg-ink/5 p-5">No times are available on this date. Try another date or professional.</p> : null}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {slots.map((slot) => (
                    <button aria-pressed={selectedSlot?.startAt === slot.startAt} className={`min-h-12 rounded-xl border font-semibold ${selectedSlot?.startAt === slot.startAt ? "border-clay bg-clay text-white" : "border-ink/15 bg-white"}`} key={slot.startAt} onClick={() => setSelectedSlot(slot)} type="button">{slot.localTimeLabel}</button>
                  ))}
                </div>
              </div>
              <div className="mt-8 flex gap-3"><button className="min-h-12 rounded-full border border-ink/20 px-6 font-semibold" onClick={() => setStage("date")} type="button">Back</button><button className="min-h-12 rounded-full bg-ink px-7 font-semibold text-cream disabled:opacity-50" disabled={!selectedSlot} onClick={() => { setSubmitError(""); setStage("details"); }} type="button">Continue</button></div>
            </div>
          ) : null}

          {stage === "details" ? (
            <form onSubmit={(event) => { event.preventDefault(); if (validateDetails()) setStage("review"); }}>
              <h2 className="font-display text-4xl">Your details</h2>
              <p className="mt-3 text-ink/60">We’ll use these details only for your appointment.</p>
              <div className="mt-8 grid gap-5 sm:grid-cols-2">
                {(["customerName", "customerEmail", "customerPhone"] as const).map((field) => {
                  const labels = { customerName: "Name", customerEmail: "Email", customerPhone: "Phone" };
                  return <label className={field === "customerPhone" ? "sm:col-span-2" : ""} key={field}><span className="font-semibold">{labels[field]}</span><input aria-describedby={fieldErrors[field] ? `${field}-error` : undefined} aria-invalid={Boolean(fieldErrors[field])} className="mt-2 min-h-12 w-full rounded-xl border border-ink/20 bg-white px-4" onChange={(event) => updateDetail(field, event.target.value)} required type={field === "customerEmail" ? "email" : field === "customerPhone" ? "tel" : "text"} value={details[field]} />{fieldErrors[field]?.map((error) => <span className="mt-1 block text-sm text-clay" id={`${field}-error`} key={error}>{error}</span>)}</label>;
                })}
                <label className="sm:col-span-2"><span className="font-semibold">Note <span className="font-normal text-ink/45">(optional)</span></span><textarea aria-describedby={fieldErrors.customerNote ? "customerNote-error" : undefined} className="mt-2 min-h-28 w-full rounded-xl border border-ink/20 bg-white p-4" maxLength={2000} onChange={(event) => updateDetail("customerNote", event.target.value)} value={details.customerNote} />{fieldErrors.customerNote?.map((error) => <span className="mt-1 block text-sm text-clay" id="customerNote-error" key={error}>{error}</span>)}</label>
              </div>
              <div className="mt-8 flex gap-3"><button className="min-h-12 rounded-full border border-ink/20 px-6 font-semibold" onClick={openTimeSelection} type="button">Back</button><button className="min-h-12 rounded-full bg-ink px-7 font-semibold text-cream" type="submit">Review booking</button></div>
            </form>
          ) : null}

          {stage === "review" && selectedSlot ? (
            <div>
              <h2 className="font-display text-4xl">Review your booking</h2>
              <dl className="mt-8 divide-y divide-ink/10 border-y border-ink/10">
                {[["Service", service.name], ["Professional", selectedStaffName ?? "Any available"], ["Date and time", formatStudioDateTime(selectedSlot.startAt, timezone)], ["Duration", formatDuration(service.durationMinutes)], ["Price", formatPrice(service.priceCents, service.currency)], ["Name", details.customerName], ["Email", details.customerEmail], ["Phone", details.customerPhone], ...(details.customerNote.trim() ? [["Note", details.customerNote]] : [])].map(([label, value]) => <div className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr]" key={label}><dt className="text-sm text-ink/50">{label}</dt><dd className="font-semibold">{value}</dd></div>)}
              </dl>
              <p className="mt-6 text-sm leading-6 text-ink/55">Availability is checked again when you confirm. Your booking begins with pending status.</p>
              <div className="mt-8 flex flex-wrap gap-3"><button className="min-h-12 rounded-full border border-ink/20 px-6 font-semibold" disabled={submitting} onClick={() => setStage("details")} type="button">Back</button><button className="min-h-12 rounded-full bg-ink px-7 font-semibold text-cream disabled:cursor-wait disabled:opacity-60" disabled={submitting} onClick={submitBooking} type="button">{submitting ? "Confirming…" : "Confirm booking"}</button></div>
            </div>
          ) : null}
        </div>

        <aside className="h-fit rounded-[2rem] bg-sage p-7 text-cream lg:sticky lg:top-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cream/70">Your selection</p>
          <h2 className="mt-4 font-display text-3xl">{service.name}</h2>
          <p className="mt-4 text-sm leading-6 text-cream/80">{formatDuration(service.durationMinutes)} · {formatPrice(service.priceCents, service.currency)}</p>
          <dl className="mt-6 space-y-4 border-t border-cream/20 pt-6 text-sm">
            <div><dt className="text-cream/60">Professional</dt><dd className="mt-1 font-semibold">{selectedStaffName ?? "Any available"}</dd></div>
            <div><dt className="text-cream/60">Date</dt><dd className="mt-1 font-semibold">{date}</dd></div>
            {selectedSlot ? <div><dt className="text-cream/60">Time</dt><dd className="mt-1 font-semibold">{selectedSlot.localTimeLabel} ({timezone})</dd></div> : null}
          </dl>
        </aside>
      </div>
    </section>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

const weekdays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as const;
type Weekday = typeof weekdays[number];
type Schedule = {
  staff: { id: string; name: string; status: "ACTIVE" | "DISABLED" };
  timezone: string;
  rules: Array<{ id: string; weekday: Weekday; startLocalMinutes: number; endLocalMinutes: number }>;
  blockedTimes: Array<{ id: string; localDate: string; startTime: string; endTime: string; reason: string | null }>;
};

function formatMinutes(value: number) {
  if (value === 1440) return "24:00";
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function errorText(body: { error?: string; fields?: Record<string, string[]> }, fallback: string) {
  return Object.values(body.fields ?? {}).flat().join(" ") || body.error || fallback;
}

export function ScheduleEditor({ schedule }: { schedule: Schedule }) {
  const router = useRouter();
  const [pending, setPending] = useState("");
  const [message, setMessage] = useState("");
  const disabled = schedule.staff.status === "DISABLED";
  const inputClass = "admin-field";

  async function createRule(event: FormEvent<HTMLFormElement>, weekday: Weekday) {
    event.preventDefault(); const key = `add-${weekday}`; if (pending) return; setPending(key); setMessage("");
    const submittedForm = event.currentTarget;
    const form = new FormData(submittedForm);
    try {
      const response = await fetch("/api/admin/availability", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ staffId: schedule.staff.id, weekday, startTime: form.get("startTime"), endTime: form.get("endTime") }) });
      const body = await response.json(); if (!response.ok) return setMessage(errorText(body, "The availability window could not be added."));
      submittedForm.reset(); setMessage("Availability window added."); router.refresh();
    } catch { setMessage("The availability window could not be added."); } finally { setPending(""); }
  }

  async function remove(path: string, key: string, label: string) {
    if (pending) return; setPending(key); setMessage("");
    try { const response = await fetch(path, { method: "DELETE" }); const body = await response.json(); if (!response.ok) return setMessage(errorText(body, `${label} could not be removed.`)); router.refresh(); }
    catch { setMessage(`${label} could not be removed.`); } finally { setPending(""); }
  }

  async function createBlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return; setPending("block"); setMessage(""); const submittedForm = event.currentTarget; const form = new FormData(submittedForm);
    try {
      const response = await fetch("/api/admin/blocked-times", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ staffId: schedule.staff.id, date: form.get("date"), startTime: form.get("startTime"), endTime: form.get("endTime"), reason: form.get("reason") }) });
      const body = await response.json(); if (!response.ok) return setMessage(errorText(body, "The blocked period could not be added."));
      submittedForm.reset(); setMessage("Blocked period added."); router.refresh();
    } catch { setMessage("The blocked period could not be added."); } finally { setPending(""); }
  }

  return <div className="mt-10 space-y-10">
    <p aria-live="polite" className="min-h-6 rounded-xl text-sm font-semibold text-clay" id="schedule-message">{message}</p>
    <section><h2 className="font-display text-3xl">Recurring availability</h2><p className="mt-2 text-sm text-ink/55">Times are local to {schedule.timezone}. Touching windows are allowed; overlapping windows are not.</p>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">{weekdays.map((weekday) => { const rules = schedule.rules.filter((rule) => rule.weekday === weekday); return <article className="admin-surface p-5" key={weekday}><h3 className="font-display text-2xl capitalize">{weekday.toLowerCase()}</h3>
        {rules.length === 0 ? <p className="mt-4 text-sm text-ink/50">No working windows.</p> : <ul className="mt-4 space-y-2">{rules.map((rule) => <li className="flex min-h-12 items-center justify-between gap-4 rounded-xl bg-cream px-4" key={rule.id}><span className="font-semibold">{formatMinutes(rule.startLocalMinutes)}–{formatMinutes(rule.endLocalMinutes)}</span><button className="min-h-11 text-sm font-semibold text-clay underline disabled:opacity-50" disabled={Boolean(pending)} onClick={() => remove(`/api/admin/availability/${rule.id}`, `rule-${rule.id}`, "Availability window")} type="button">{pending === `rule-${rule.id}` ? "Removing…" : "Remove window"}</button></li>)}</ul>}
        <form aria-describedby="schedule-message" className="mt-4 grid grid-cols-[1fr_1fr_auto] gap-2" onSubmit={(event) => createRule(event, weekday)}><label className="text-xs font-semibold">Start<input className={`${inputClass} mt-1 w-full`} disabled={disabled} name="startTime" required type="time" /></label><label className="text-xs font-semibold">End<input className={`${inputClass} mt-1 w-full`} disabled={disabled} name="endTime" required type="time" /></label><button className="admin-button-primary mt-5 px-4 text-sm" disabled={disabled || Boolean(pending)} type="submit">Add</button></form>
      </article>; })}</div>
    </section>
    <section><h2 className="font-display text-3xl">Blocked time</h2><p className="mt-2 text-sm text-ink/55">Blocks use the studio timezone and cannot overlap another block or an active appointment.</p>
      <form aria-describedby="schedule-message" className="admin-surface mt-6 grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5" onSubmit={createBlock}><label className="text-sm font-semibold">Date<input className={`${inputClass} mt-2 w-full`} disabled={disabled} name="date" required type="date" /></label><label className="text-sm font-semibold">Start<input className={`${inputClass} mt-2 w-full`} disabled={disabled} name="startTime" required type="time" /></label><label className="text-sm font-semibold">End<input className={`${inputClass} mt-2 w-full`} disabled={disabled} name="endTime" required type="time" /></label><label className="text-sm font-semibold lg:col-span-2">Reason <span className="font-normal text-ink/45">(optional)</span><input className={`${inputClass} mt-2 w-full`} disabled={disabled} maxLength={500} name="reason" /></label><button className="admin-button-primary" disabled={disabled || Boolean(pending)} type="submit">{pending === "block" ? "Adding…" : "Add blocked time"}</button></form>
      {schedule.blockedTimes.length === 0 ? <p className="mt-5 rounded-2xl border border-ink/10 bg-white p-6 text-ink/50">No blocked time recorded.</p> : <ul className="mt-5 space-y-3">{schedule.blockedTimes.map((block) => <li className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-ink/10 bg-white p-5" key={block.id}><div><p className="font-semibold">{block.localDate} · {block.startTime}–{block.endTime}</p>{block.reason ? <p className="mt-1 text-sm text-ink/55">{block.reason}</p> : null}</div><button className="min-h-11 text-sm font-semibold text-clay underline disabled:opacity-50" disabled={Boolean(pending)} onClick={() => remove(`/api/admin/blocked-times/${block.id}`, `block-${block.id}`, "Blocked period")} type="button">{pending === `block-${block.id}` ? "Removing…" : "Delete blocked time"}</button></li>)}</ul>}
    </section>
  </div>;
}


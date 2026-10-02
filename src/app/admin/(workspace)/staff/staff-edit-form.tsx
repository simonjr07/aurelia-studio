"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type StaffValues = { id: string; name: string; email: string; status: "ACTIVE" | "DISABLED"; services: Array<{ id: string; name: string; isActive: boolean }>; assignedIds: string[] };

export function StaffEditForm({ staff }: { staff: StaffValues }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const profile = await fetch(`/api/admin/staff/${staff.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.get("name"), status: form.get("status") }) });
      const profileBody = await profile.json();
      if (!profile.ok) {
        const fieldMessage = Object.values(profileBody.fields ?? {}).flat().join(" ");
        return setMessage(fieldMessage || profileBody.error || "The staff account could not be saved.");
      }
      const assignments = await fetch(`/api/admin/staff/${staff.id}/services`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ serviceIds: form.getAll("serviceIds") }) });
      const assignmentBody = await assignments.json();
      if (!assignments.ok) return setMessage(assignmentBody.error || "The service assignments could not be saved.");
      setMessage("Staff account saved."); router.refresh();
    } catch { setMessage("The staff account could not be saved."); }
    finally { setPending(false); }
  }
  const inputClass = "admin-field mt-2 px-4";
  return <form className="mt-8 space-y-8" onSubmit={submit}>
    <section className="space-y-6 rounded-[2rem] border border-ink/10 bg-white p-6 sm:p-9"><h2 className="font-display text-3xl">Account</h2><label className="block font-semibold">Name<input className={inputClass} defaultValue={staff.name} maxLength={120} name="name" required /></label><div><p className="font-semibold">Email</p><p className="mt-2 text-ink/60">{staff.email}</p></div><label className="block font-semibold">Status<select className={inputClass} defaultValue={staff.status} name="status"><option value="ACTIVE">Active</option><option value="DISABLED">Disabled</option></select></label><p className="text-sm text-ink/55">Disabling immediately blocks login and protected access, and removes this person from public availability. Historical bookings remain unchanged.</p></section>
    <section className="rounded-[2rem] border border-ink/10 bg-white p-6 sm:p-9"><h2 className="font-display text-3xl">Assigned services</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{staff.services.map((service) => <label className="flex min-h-12 items-center gap-3 rounded-xl border border-ink/10 px-4" key={service.id}><input defaultChecked={staff.assignedIds.includes(service.id)} name="serviceIds" type="checkbox" value={service.id} /><span>{service.name}{!service.isActive ? <span className="ml-2 text-xs text-clay">Inactive</span> : null}</span></label>)}</div></section>
    <button className="min-h-11 rounded-full bg-ink px-6 font-semibold text-cream disabled:opacity-50" disabled={pending}>{pending ? "Saving…" : "Save staff account"}</button><p aria-live="polite" className="text-sm font-semibold text-clay">{message}</p>
  </form>;
}


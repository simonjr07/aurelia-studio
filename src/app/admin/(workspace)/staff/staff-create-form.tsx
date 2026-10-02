"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function StaffCreateForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true); setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.get("name"), email: form.get("email"), password: form.get("password") }) });
      const body = await response.json();
      if (!response.ok) {
        const fieldMessage = Object.values(body.fields ?? {}).flat().join(" ");
        return setMessage(fieldMessage || body.error || "The staff account could not be created.");
      }
      router.push(`/admin/staff/${body.id}`); router.refresh();
    } catch { setMessage("The staff account could not be created."); }
    finally { setPending(false); }
  }
  const inputClass = "admin-field mt-2 px-4";
  return <form className="admin-surface mt-8 space-y-6 p-6 sm:p-9" onSubmit={submit}>
    <label className="block font-semibold">Name<input className={inputClass} maxLength={120} name="name" required /></label>
    <label className="block font-semibold">Email<input autoComplete="email" className={inputClass} maxLength={320} name="email" required type="email" /></label>
    <label className="block font-semibold">Temporary password<input autoComplete="new-password" className={inputClass} minLength={12} name="password" required type="password" /><span className="mt-2 block text-sm font-normal text-ink/50">At least 12 characters. Share it securely; it is never shown again.</span></label>
    <button className="admin-button-primary" disabled={pending}>{pending ? "Creating…" : "Create staff account"}</button><p aria-live="polite" className="text-sm font-semibold text-clay">{message}</p>
  </form>;
}


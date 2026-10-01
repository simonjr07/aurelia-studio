"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type ServiceValues = {
  id?: string; name: string; slug: string; description: string; durationMinutes: number;
  priceCents: number; currency: string; isPublished: boolean; isActive: boolean;
};

export function ServiceForm({ service }: { service?: ServiceValues }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      name: form.get("name"), slug: form.get("slug"), description: form.get("description"),
      durationMinutes: form.get("durationMinutes"), price: form.get("price"), currency: form.get("currency"),
      isPublished: form.get("isPublished") === "on", isActive: form.get("isActive") === "on",
    };
    try {
      const response = await fetch(service?.id ? `/api/admin/services/${service.id}` : "/api/admin/services", {
        method: service?.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) {
        const fieldMessage = Object.values(body.fields ?? {}).flat().join(" ");
        return setMessage(fieldMessage || body.error || "The service could not be saved.");
      }
      router.push(`/admin/services/${body.id}`);
      router.refresh();
    } catch {
      setMessage("The service could not be saved.");
    } finally {
      setPending(false);
    }
  }

  const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-ink/20 bg-white px-4 focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/25";
  return (
    <form className="mt-8 space-y-6 rounded-[2rem] border border-ink/10 bg-white p-6 sm:p-9" onSubmit={submit}>
      <div className="grid gap-6 sm:grid-cols-2">
        <label className="font-semibold">Name<input className={inputClass} defaultValue={service?.name} maxLength={120} name="name" required /></label>
        <label className="font-semibold">Slug <span className="font-normal text-ink/50">(generated from name if blank)</span><input className={inputClass} defaultValue={service?.slug} maxLength={160} name="slug" /></label>
      </div>
      <label className="block font-semibold">Description<textarea className={`${inputClass} min-h-36 py-3`} defaultValue={service?.description} maxLength={5000} name="description" required /></label>
      <div className="grid gap-6 sm:grid-cols-3">
        <label className="font-semibold">Duration (minutes)<input className={inputClass} defaultValue={service?.durationMinutes ?? 60} max={720} min={5} name="durationMinutes" required step={1} type="number" /></label>
        <label className="font-semibold">Price<input className={inputClass} defaultValue={service ? (service.priceCents / 100).toFixed(2) : "0.00"} inputMode="decimal" name="price" required /></label>
        <label className="font-semibold">Currency<input className={inputClass} defaultValue={service?.currency ?? "USD"} maxLength={3} minLength={3} name="currency" required /></label>
      </div>
      <div className="flex flex-wrap gap-6">
        <label className="flex min-h-11 items-center gap-3 font-semibold"><input defaultChecked={service?.isPublished ?? false} name="isPublished" type="checkbox" /> Published publicly</label>
        <label className="flex min-h-11 items-center gap-3 font-semibold"><input defaultChecked={service?.isActive ?? true} name="isActive" type="checkbox" /> Active and bookable</label>
      </div>
      <p className="text-sm text-ink/55">Changing a slug changes its public URL. Unpublish or deactivate instead of deleting services with history.</p>
      <button className="min-h-11 rounded-full bg-ink px-6 font-semibold text-cream disabled:opacity-50" disabled={pending} type="submit">{pending ? "Saving…" : "Save service"}</button>
      <p aria-live="polite" className="text-sm font-semibold text-clay">{message}</p>
    </form>
  );
}


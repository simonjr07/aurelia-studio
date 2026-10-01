import Link from "next/link";
import { formatDuration, formatPrice } from "@/lib/formatters";
import { requireAdmin } from "@/server/auth/access";
import { listManagedServices } from "@/server/management/management-service";

export const metadata = { title: "Services" };

export default async function ServicesPage() {
  const actor = await requireAdmin();
  const services = await listManagedServices(actor);
  return <main className="px-6 py-10 sm:px-10 sm:py-14"><div className="mx-auto max-w-6xl">
    <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-clay">Catalogue</p><h1 className="mt-4 font-display text-5xl sm:text-6xl">Services</h1></div><Link className="inline-flex min-h-11 items-center rounded-full bg-ink px-6 font-semibold text-cream" href="/admin/services/new">New service</Link></div>
    {services.length === 0 ? <p className="mt-10 rounded-2xl border border-ink/10 bg-white p-7">No services yet.</p> : <ul className="mt-8 space-y-3">{services.map((service) => <li key={service.id}><Link className="grid gap-3 rounded-2xl border border-ink/10 bg-white p-5 hover:border-clay/40 sm:grid-cols-[1.3fr_1fr_auto] sm:items-center" href={`/admin/services/${service.id}`}><div><p className="font-display text-2xl">{service.name}</p><p className="font-mono text-sm text-ink/50">/{service.slug}</p></div><p className="text-sm">{formatDuration(service.durationMinutes)} · {formatPrice(service.priceCents, service.currency)}<br/><span className="text-ink/50">{service._count.staffServices} assigned staff</span></p><div className="flex gap-2 text-xs font-bold uppercase"><span className={service.isPublished ? "text-forest" : "text-clay"}>{service.isPublished ? "Published" : "Hidden"}</span><span>·</span><span>{service.isActive ? "Active" : "Inactive"}</span></div></Link></li>)}</ul>}
  </div></main>;
}


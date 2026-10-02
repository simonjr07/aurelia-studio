import Link from "next/link";
import { formatDuration, formatPrice } from "@/lib/formatters";
import { requireAdmin } from "@/server/auth/access";
import { listManagedServices } from "@/server/management/management-service";

export const metadata = { title: "Services" };

export default async function ServicesPage() {
  const actor = await requireAdmin();
  const services = await listManagedServices(actor);
  return <main className="admin-main"><div className="mx-auto max-w-6xl">
    <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="admin-eyebrow">Catalogue</p><h1 className="mt-4 font-display text-5xl sm:text-6xl">Services</h1></div><Link className="admin-button-primary" href="/admin/services/new">New service</Link></div>
    {services.length === 0 ? <div className="admin-surface mt-8 p-7"><h2 className="font-display text-3xl">No services yet</h2><p className="mt-2 text-sm text-ink/60">Create the first service to make it available to the catalogue.</p></div> : <ul className="mt-8 space-y-3">{services.map((service) => <li key={service.id}><Link className="admin-surface grid gap-3 p-5 transition hover:border-clay/40 sm:grid-cols-[1.3fr_1fr_auto] sm:items-center" href={`/admin/services/${service.id}`}><div><p className="font-display text-2xl">{service.name}</p><p className="font-mono text-sm text-ink/50">/{service.slug}</p></div><p className="text-sm">{formatDuration(service.durationMinutes)} · {formatPrice(service.priceCents, service.currency)}<br/><span className="text-ink/50">{service._count.staffServices} assigned staff</span></p><div className="flex flex-wrap gap-2 text-xs font-bold uppercase"><span className={service.isPublished ? "text-sage" : "text-clay"}>{service.isPublished ? "Published" : "Unpublished"}</span><span>·</span><span className={service.isActive ? "text-sage" : "text-clay"}>{service.isActive ? "Active" : "Inactive"}</span></div></Link></li>)}</ul>}
  </div></main>;
}


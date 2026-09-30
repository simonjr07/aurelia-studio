import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";
import { formatDuration, formatPrice } from "@/lib/formatters";
import { getPublicServiceBySlug } from "@/server/services/public-services";

type ServicePageProps = {
  params: Promise<{ slug: string }>;
};

function metadataDescription(description: string) {
  const normalized = description.replace(/\s+/g, " ").trim();
  return normalized.length <= 155
    ? normalized
    : `${normalized.slice(0, 152).trimEnd()}…`;
}

export async function generateMetadata({
  params,
}: ServicePageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = await getPublicServiceBySlug(slug);

  if (!service) {
    notFound();
  }

  return {
    title: `${service.name} | Aurelia Studio`,
    description: metadataDescription(service.description),
  };
}

export default async function ServiceDetailPage({ params }: ServicePageProps) {
  const { slug } = await params;
  const service = await getPublicServiceBySlug(slug);

  if (!service) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-cream text-ink">
      <PublicHeader />
      <article>
        <section className="relative overflow-hidden border-b border-ink/10">
          <div className="mx-auto grid w-full max-w-7xl gap-14 px-6 py-16 sm:px-10 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:px-12 lg:py-28">
            <div className="relative z-10">
              <Link
                className="inline-flex min-h-11 items-center text-sm font-semibold underline decoration-clay/45 underline-offset-8 hover:decoration-clay"
                href="/services"
              >
                ← All services
              </Link>
              <p className="mt-12 text-xs font-semibold uppercase tracking-[0.26em] text-clay">
                Aurelia Studio service
              </p>
              <h1 className="mt-5 max-w-4xl font-display text-6xl leading-[0.95] tracking-[-0.045em] sm:text-7xl lg:text-8xl">
                {service.name}
              </h1>
            </div>
            <div className="relative flex min-h-72 items-end overflow-hidden rounded-[2.5rem] bg-sage p-8 text-cream shadow-2xl shadow-ink/10 sm:p-10">
              <div
                aria-hidden="true"
                className="absolute -right-16 -top-20 h-72 w-72 rounded-full border border-cream/45"
              />
              <div
                aria-hidden="true"
                className="absolute right-12 top-10 h-44 w-44 rounded-full border border-cream/35"
              />
              <p className="relative font-display text-3xl italic leading-tight">
                Unhurried care,
                <br /> beautifully held.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-7xl gap-14 px-6 py-16 sm:px-10 sm:py-20 lg:grid-cols-[1fr_0.7fr] lg:px-12 lg:py-24">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-clay">
              About this service
            </p>
            <p className="mt-6 max-w-3xl font-display text-3xl leading-[1.35] tracking-[-0.015em] sm:text-4xl">
              {service.description}
            </p>

            <section className="mt-16 border-t border-ink/10 pt-10">
              <h2 className="font-display text-3xl">Eligible professionals</h2>
              {service.eligibleStaff.length > 0 ? (
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {service.eligibleStaff.map((staff) => (
                    <li
                      className="rounded-2xl border border-ink/10 bg-white/45 px-5 py-4 font-semibold"
                      key={staff.id}
                    >
                      {staff.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 leading-7 text-ink/60">
                  No staff assigned yet. Appointment selection will become
                  available once the studio schedule is ready.
                </p>
              )}
            </section>
          </div>

          <aside className="h-fit rounded-[2rem] border border-ink/10 bg-white/60 p-7 shadow-[0_24px_70px_rgba(32,35,31,0.06)] sm:p-9">
            <h2 className="font-display text-3xl">Service details</h2>
            <dl className="mt-8 divide-y divide-ink/10 border-y border-ink/10">
              <div className="flex items-center justify-between gap-4 py-5">
                <dt className="text-sm text-ink/55">Duration</dt>
                <dd className="font-semibold">
                  {formatDuration(service.durationMinutes)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-5">
                <dt className="text-sm text-ink/55">Price</dt>
                <dd className="font-display text-2xl">
                  {formatPrice(service.priceCents, service.currency)}
                </dd>
              </div>
            </dl>
            <Link
              className="mt-8 flex min-h-12 w-full items-center justify-center rounded-full bg-ink px-6 text-sm font-semibold text-cream transition hover:bg-clay"
              href={`/book/${service.slug}`}
            >
              Choose a time
            </Link>
            <p className="mt-4 text-center text-xs leading-5 text-ink/50">
              Availability is rechecked when you confirm.
            </p>
          </aside>
        </section>
      </article>
      <PublicFooter />
    </main>
  );
}

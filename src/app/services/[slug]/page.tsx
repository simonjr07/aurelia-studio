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
    <main className="public-shell">
      <PublicHeader />
      <article>
        <section className="relative overflow-hidden border-b border-ink/10">
          <div className="public-container grid gap-14 py-14 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
            <div className="relative z-10">
              <Link
                className="public-button-quiet -ml-4"
                href="/services"
              >
                ← All services
              </Link>
              <p className="public-eyebrow mt-10">
                Aurelia Studio service
              </p>
              <h1 className="public-display mt-5 max-w-4xl text-6xl leading-[0.9] sm:text-7xl lg:text-8xl">
                {service.name}
              </h1>
            </div>
            <div className="public-grid-texture relative flex min-h-72 items-end overflow-hidden rounded-[45%_45%_1.5rem_1.5rem] bg-sage p-8 text-cream shadow-2xl shadow-ink/10 sm:p-10">
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

        <section className="public-container grid gap-14 py-16 sm:py-20 lg:grid-cols-[1fr_0.7fr] lg:py-24">
          <div>
            <p className="public-eyebrow">
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
                      className="flex min-h-16 items-center gap-3 border border-ink/10 bg-paper/55 px-5 py-4 font-semibold"
                      key={staff.id}
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sage/10 font-display text-lg text-sage" aria-hidden="true">{staff.name.charAt(0)}</span>
                      {staff.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 leading-7 text-ink/60">
                  No professionals are currently available for online booking. Please choose another service or check back soon.
                </p>
              )}
            </section>
          </div>

          <aside className="public-surface h-fit p-7 sm:p-9 lg:sticky lg:top-6">
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
            {service.eligibleStaff.length > 0 ? (
              <>
                <Link
                  className="public-button-primary mt-8 w-full"
                  href={`/book/${service.slug}`}
                >
                  Choose a time
                </Link>
                <p className="mt-4 text-center text-xs leading-5 text-ink/50">
                  Availability is rechecked when you confirm.
                </p>
              </>
            ) : (
              <div className="public-alert-info mt-8">
                Online booking is not available for this service right now. Explore the menu for another option.
              </div>
            )}
          </aside>
        </section>
      </article>
      <PublicFooter />
    </main>
  );
}

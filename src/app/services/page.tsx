import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";
import { ServiceCard } from "@/components/public/service-card";
import { getPublicServices } from "@/server/services/public-services";

export const metadata: Metadata = {
  title: "Services | Aurelia Studio",
  description:
    "Explore Aurelia Studio's considered beauty and wellness services, with clear pricing and treatment times.",
};

function CatalogueSkeleton() {
  return (
    <div aria-label="Loading services" className="grid gap-6 md:grid-cols-2">
      {[0, 1, 2, 3].map((item) => (
        <div
          aria-hidden="true"
          className="min-h-[25rem] animate-pulse rounded-[2rem] border border-ink/10 bg-white/35"
          key={item}
        />
      ))}
    </div>
  );
}

async function Catalogue() {
  await connection();
  const services = await getPublicServices();

  if (services.length === 0) {
    return (
      <div className="rounded-[2rem] border border-ink/10 bg-white/55 px-7 py-16 text-center sm:px-12">
        <h2 className="font-display text-3xl">Our menu is being prepared</h2>
        <p className="mx-auto mt-4 max-w-xl leading-7 text-ink/60">
          No services are available online just yet. Please check back soon as
          we finish curating the studio catalogue.
        </p>
        <Link
          className="mt-8 inline-flex min-h-11 items-center rounded-full border border-ink/15 px-5 text-sm font-semibold"
          href="/"
        >
          Return home
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {services.map((service, index) => (
        <ServiceCard index={index} key={service.id} service={service} />
      ))}
    </div>
  );
}

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-cream text-ink">
      <PublicHeader />
      <section className="mx-auto w-full max-w-7xl px-6 pb-24 pt-16 sm:px-10 sm:pt-20 lg:px-12 lg:pb-32">
        <div className="grid gap-8 border-b border-ink/10 pb-14 lg:grid-cols-[1fr_0.65fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-clay">
              The studio menu
            </p>
            <h1 className="mt-5 max-w-3xl font-display text-6xl leading-[0.98] tracking-[-0.04em] sm:text-7xl">
              Care, considered for you.
            </h1>
          </div>
          <p className="max-w-xl text-lg leading-8 text-ink/60 lg:justify-self-end">
            Explore restorative treatments with transparent timing and pricing.
            Online appointment selection will follow in the next release.
          </p>
        </div>
        <div className="pt-10 sm:pt-14">
          <Suspense fallback={<CatalogueSkeleton />}>
            <Catalogue />
          </Suspense>
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}

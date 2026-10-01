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
    <div aria-label="Loading services" aria-live="polite" className="grid gap-5 md:grid-cols-2">
      {[0, 1, 2, 3].map((item) => (
        <div
          aria-hidden="true"
          className="min-h-[23rem] animate-pulse border border-ink/10 bg-paper/45"
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
      <div className="public-surface px-7 py-16 text-center sm:px-12">
        <h2 className="font-display text-3xl">Our menu is being prepared</h2>
        <p className="mx-auto mt-4 max-w-xl leading-7 text-ink/60">
          No services are available online just yet. Please check back soon as
          we finish curating the studio catalogue.
        </p>
        <Link
          className="public-button-secondary mt-8"
          href="/"
        >
          Return home
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {services.map((service, index) => (
        <ServiceCard index={index} key={service.id} service={service} />
      ))}
    </div>
  );
}

export default function ServicesPage() {
  return (
    <main className="public-shell">
      <PublicHeader />
      <section className="public-container pb-24 pt-14 sm:pt-20 lg:pb-28">
        <div className="grid gap-8 border-b border-ink/10 pb-14 lg:grid-cols-[1fr_0.65fr] lg:items-end">
          <div>
            <p className="public-eyebrow">
              The studio menu
            </p>
            <h1 className="public-display mt-5 max-w-3xl text-6xl leading-[0.94] sm:text-7xl">
              A menu with room to breathe.
            </h1>
          </div>
          <p className="max-w-xl text-lg leading-8 text-ink/60 lg:justify-self-end">
            Explore each service with clear timing, pricing, and professional availability—then reserve online when you’re ready.
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

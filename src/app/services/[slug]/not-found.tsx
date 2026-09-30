import Link from "next/link";

import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";

export default function ServiceNotFound() {
  return (
    <main className="min-h-screen bg-cream text-ink">
      <PublicHeader />
      <section className="mx-auto flex min-h-[65vh] w-full max-w-3xl flex-col items-center justify-center px-6 py-20 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-clay">
          Service unavailable
        </p>
        <h1 className="mt-5 font-display text-6xl tracking-[-0.04em]">
          This treatment isn&apos;t on our menu.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-ink/60">
          It may be unavailable or no longer offered. Browse the current studio
          catalogue to find another considered service.
        </p>
        <Link
          className="mt-9 inline-flex min-h-12 items-center rounded-full bg-ink px-6 text-sm font-semibold text-cream"
          href="/services"
        >
          View available services
        </Link>
      </section>
      <PublicFooter />
    </main>
  );
}

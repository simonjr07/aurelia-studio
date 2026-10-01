import Link from "next/link";
import { connection } from "next/server";

import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";
import { formatDuration, formatPrice } from "@/lib/formatters";
import { getPublicServices } from "@/server/services/public-services";

const experience = [
  ["Clear by design", "See timing, pricing, and available professionals before you reserve."],
  ["Made around you", "Choose someone specific or let the studio pair you with anyone available."],
  ["Easy to revisit", "Use your private reference and email to review or change an eligible booking."],
] as const;

export default async function Home() {
  await connection();
  const featuredServices = (await getPublicServices()).slice(0, 3);

  return (
    <main className="public-shell">
      <PublicHeader />

      <section className="public-container grid min-h-[44rem] items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.08fr_0.92fr] lg:py-24">
        <div className="relative z-10 max-w-3xl">
          <p className="public-eyebrow">Beauty · Wellness · Your time</p>
          <h1 className="public-display mt-6 text-[3.55rem] leading-[0.9] sm:text-7xl lg:text-[6.75rem]">
            Rituals for feeling
            <span className="block italic text-clay">like yourself.</span>
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-8 text-ink/65 sm:text-xl">
            Considered beauty and wellness care, with a booking experience that feels as calm as the visit itself.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link className="public-button-primary" href="/services">Explore services</Link>
            <Link className="public-button-secondary" href="/manage-booking">Manage a booking</Link>
          </div>
        </div>

        <div className="relative mx-auto aspect-[4/5] w-full max-w-[29rem]" aria-hidden="true">
          <div className="public-grid-texture absolute inset-x-5 inset-y-0 overflow-hidden rounded-[48%_48%_1.5rem_1.5rem] bg-sage shadow-[0_2.5rem_6rem_rgba(39,36,31,0.16)]">
            <div className="absolute left-1/2 top-[12%] h-[72%] w-[58%] -translate-x-1/2 rounded-[50%] border border-cream/45" />
            <div className="absolute left-[18%] top-[28%] h-48 w-48 rounded-full border border-cream/25" />
            <div className="absolute -right-10 bottom-[14%] h-40 w-40 rounded-full bg-clay" />
            <div className="absolute bottom-[13%] left-[12%] h-36 w-px rotate-[32deg] bg-cream/55" />
          </div>
          <div className="absolute -bottom-3 left-0 w-44 border border-ink/10 bg-paper p-5 shadow-xl shadow-ink/10">
            <p className="font-display text-2xl italic leading-tight">Space to pause.<br />Care to return to.</p>
          </div>
        </div>
      </section>

      <section className="border-y border-ink/10 bg-paper/48" aria-labelledby="experience-title">
        <div className="public-container py-16 sm:py-20">
          <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
            <div>
              <p className="public-eyebrow">The Aurelia experience</p>
              <h2 id="experience-title" className="public-display mt-4 text-5xl leading-none sm:text-6xl">Care without the guesswork.</h2>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-ink/60 lg:justify-self-end">From exploring the menu to keeping your confirmation close, every step is designed to be clear, private, and unhurried.</p>
          </div>
          <div className="mt-12 grid border-y border-ink/10 md:grid-cols-3 md:divide-x md:divide-ink/10">
            {experience.map(([title, description], index) => (
              <article className="border-b border-ink/10 py-8 last:border-0 md:border-b-0 md:px-8 md:first:pl-0 md:last:pr-0" key={title}>
                <p className="public-eyebrow">0{index + 1}</p>
                <h3 className="public-display mt-5 text-3xl">{title}</h3>
                <p className="mt-3 leading-7 text-ink/60">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="public-container py-16 sm:py-24" aria-labelledby="featured-title">
        <div className="flex flex-col gap-5 border-b border-ink/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="public-eyebrow">A considered menu</p>
            <h2 id="featured-title" className="public-display mt-4 text-5xl sm:text-6xl">Begin with what you need.</h2>
          </div>
          <Link className="public-button-secondary w-fit" href="/services">View all services</Link>
        </div>
        {featuredServices.length ? (
          <div className="grid divide-y divide-ink/10 md:grid-cols-3 md:divide-x md:divide-y-0 md:divide-ink/10">
            {featuredServices.map((service, index) => (
              <Link className="group py-8 md:px-7 md:first:pl-0 md:last:pr-0" href={`/services/${service.slug}`} key={service.id}>
                <p className="public-eyebrow">0{index + 1}</p>
                <h3 className="public-display mt-5 text-3xl transition group-hover:text-clay">{service.name}</h3>
                <p className="mt-4 line-clamp-2 leading-7 text-ink/60">{service.description}</p>
                <p className="mt-6 text-sm font-bold">{formatDuration(service.durationMinutes)} <span className="mx-2 text-clay">·</span> {formatPrice(service.priceCents, service.currency)}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-12 text-ink/60">The online menu is being prepared. Please check back soon.</div>
        )}
      </section>

      <section className="bg-clay text-cream">
        <div className="public-container grid gap-8 py-14 sm:grid-cols-[1fr_auto] sm:items-center sm:py-16">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-cream/65">Ready when you are</p>
            <h2 className="public-display mt-3 text-4xl sm:text-5xl">Choose your service. We’ll show you the time.</h2>
          </div>
          <Link className="inline-flex min-h-12 w-fit items-center rounded-full bg-cream px-6 text-sm font-bold text-ink transition hover:bg-paper" href="/services">Book a visit</Link>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}

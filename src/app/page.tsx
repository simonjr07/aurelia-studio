import Link from "next/link";

import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";

const values = [
  ["Considered services", "A curated menu designed around your time and wellbeing."],
  ["Flexible scheduling", "Choose the professional, date, and time that suit you."],
  ["Simple management", "Your booking details will stay easy to review and update."],
] as const;

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-cream text-ink">
      <PublicHeader />

      <section id="top" className="relative mx-auto grid min-h-[650px] w-full max-w-7xl items-center gap-14 px-6 py-16 sm:px-10 lg:grid-cols-[1.08fr_0.92fr] lg:px-12 lg:py-24">
        <div className="relative z-10 max-w-3xl">
          <p className="mb-7 text-xs font-semibold uppercase tracking-[0.28em] text-clay">Beauty · Wellness · Your time</p>
          <h1 className="font-display text-6xl leading-[0.94] tracking-[-0.045em] sm:text-7xl lg:text-[6.5rem]">
            Thoughtful care,
            <span className="block italic text-clay">beautifully scheduled.</span>
          </h1>
          <p className="mt-9 max-w-xl text-lg leading-8 text-ink/65 sm:text-xl">
            Discover considered beauty and wellness services with clear timing,
            pricing, and the professionals who provide them.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-5">
            <Link
              className="inline-flex min-h-12 items-center rounded-full bg-ink px-6 text-sm font-semibold text-cream shadow-lg shadow-ink/10 transition hover:bg-clay"
              href="/services"
            >
              Explore services
            </Link>
            <a className="text-sm font-semibold underline decoration-clay/50 underline-offset-8 transition hover:decoration-clay" href="#experience">
              Explore the experience
            </a>
          </div>
        </div>

        <div className="relative mx-auto aspect-[4/5] w-full max-w-md" aria-hidden="true">
          <div className="absolute inset-4 rounded-[45%_45%_8%_8%] bg-sage shadow-2xl shadow-ink/10" />
          <div className="absolute left-1/2 top-[17%] h-72 w-48 -translate-x-1/2 rounded-[50%] border border-cream/70" />
          <div className="absolute left-1/2 top-[23%] h-72 w-px -translate-x-1/2 rotate-[24deg] bg-cream/60" />
          <div className="absolute bottom-[16%] left-[16%] h-24 w-24 rounded-full bg-clay" />
          <div className="absolute bottom-[10%] right-[14%] grid h-40 w-40 place-items-center rounded-full border border-ink/20 bg-cream/90 text-center font-display text-xl italic">
            Your time,
            <br /> beautifully held
          </div>
        </div>
      </section>

      <section id="experience" className="border-y border-ink/10 bg-white/45">
        <div className="mx-auto grid w-full max-w-7xl divide-y divide-ink/10 px-6 sm:px-10 lg:grid-cols-3 lg:divide-x lg:divide-y-0 lg:px-12">
          {values.map(([title, description], index) => (
            <article className="py-10 lg:px-9 lg:py-14 first:pl-0 last:pr-0" key={title}>
              <p className="mb-6 text-xs font-semibold tracking-[0.2em] text-clay">0{index + 1}</p>
              <h2 className="font-display text-2xl">{title}</h2>
              <p className="mt-3 max-w-sm leading-7 text-ink/60">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}

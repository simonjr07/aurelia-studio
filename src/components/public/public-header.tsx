"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function PublicHeader() {
  const pathname = usePathname();
  const servicesActive = pathname.startsWith("/services") || pathname.startsWith("/book/");
  const manageActive = pathname === "/manage-booking";

  return (
    <header className="relative z-40 border-b border-ink/10 bg-cream/90 backdrop-blur-md">
      <nav
        aria-label="Primary navigation"
        className="public-container flex min-h-20 items-center justify-between gap-6"
      >
        <Link
          aria-label="Aurelia Studio home"
          className="group flex items-center gap-3"
          href="/"
        >
          <span className="grid h-9 w-9 place-items-center rounded-full border border-clay/30 font-display text-lg italic text-clay transition group-hover:bg-clay group-hover:text-cream" aria-hidden="true">A</span>
          <span>
            <span className="block font-display text-xl leading-none tracking-[0.16em]">AURELIA</span>
            <span className="mt-1 block text-[0.55rem] font-bold uppercase tracking-[0.3em] text-ink/45">Studio</span>
          </span>
        </Link>
        <div className="hidden items-center gap-1 md:flex">
          <Link
            aria-current={servicesActive ? "page" : undefined}
            className={`public-button-quiet ${servicesActive ? "bg-paper text-clay" : ""}`}
            href="/services"
          >
            Services
          </Link>
          <Link
            aria-current={manageActive ? "page" : undefined}
            className={`public-button-quiet ${manageActive ? "bg-paper text-clay" : ""}`}
            href="/manage-booking"
          >
            Manage booking
          </Link>
          <Link className="public-button-primary ml-2" href="/services">
            Book a visit
          </Link>
        </div>
        <details className="group relative md:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-ink/15 px-4 text-sm font-bold marker:hidden">
            Menu
            <span aria-hidden="true" className="text-clay transition group-open:rotate-45">+</span>
          </summary>
          <div className="absolute right-0 top-14 flex min-w-56 flex-col rounded-2xl border border-ink/10 bg-paper p-2 shadow-2xl shadow-ink/10">
            <Link aria-current={servicesActive ? "page" : undefined} className={`min-h-12 rounded-xl px-4 py-3 font-semibold hover:bg-cream ${servicesActive ? "bg-cream text-clay" : ""}`} href="/services">Services</Link>
            <Link aria-current={manageActive ? "page" : undefined} className={`min-h-12 rounded-xl px-4 py-3 font-semibold hover:bg-cream ${manageActive ? "bg-cream text-clay" : ""}`} href="/manage-booking">Manage booking</Link>
            <Link className="public-button-primary mt-1" href="/services">Book a visit</Link>
          </div>
        </details>
      </nav>
    </header>
  );
}

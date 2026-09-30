import Link from "next/link";

export function PublicHeader() {
  return (
    <header className="border-b border-ink/10 bg-cream/95">
      <nav
        aria-label="Primary navigation"
        className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 sm:px-10 lg:px-12"
      >
        <Link
          aria-label="Aurelia Studio home"
          className="font-display text-xl tracking-[0.18em]"
          href="/"
        >
          AURELIA
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-ink/70 transition hover:bg-white/60 hover:text-ink"
            href="/services"
          >
            Services
          </Link>
          <span
            aria-disabled="true"
            className="hidden min-h-11 items-center rounded-full border border-ink/15 px-4 text-xs font-semibold uppercase tracking-[0.12em] text-ink/50 sm:inline-flex"
          >
            Booking coming next
          </span>
        </div>
      </nav>
    </header>
  );
}

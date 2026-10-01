import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="border-t border-ink/10 bg-ink text-cream">
      <div className="public-container grid gap-10 py-12 sm:grid-cols-[1fr_auto] sm:items-end sm:py-16">
        <div className="max-w-md">
          <p className="font-display text-3xl tracking-[0.08em]">AURELIA</p>
          <p className="mt-4 text-sm leading-7 text-cream/60">
            A calm, considered way to discover beauty and wellness care—and reserve time that works for you.
          </p>
        </div>
        <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold">
          <Link className="hover:text-stone" href="/">Home</Link>
          <Link className="hover:text-stone" href="/services">Services</Link>
          <Link className="hover:text-stone" href="/manage-booking">Manage booking</Link>
        </nav>
      </div>
      <div className="border-t border-cream/10">
        <div className="public-container flex flex-col gap-2 py-5 text-xs text-cream/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Aurelia Studio</p>
          <p>Thoughtful care, beautifully scheduled.</p>
        </div>
      </div>
    </footer>
  );
}

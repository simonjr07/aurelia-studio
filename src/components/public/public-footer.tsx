import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="border-t border-ink/10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 py-8 text-xs uppercase tracking-[0.15em] text-ink/45 sm:flex-row sm:items-center sm:justify-between sm:px-10 lg:px-12">
        <p>© {new Date().getFullYear()} Aurelia Studio</p>
        <div className="flex items-center gap-5">
          <Link className="hover:text-ink" href="/services">
            Services
          </Link>
          <p>Premium appointment care</p>
        </div>
      </div>
    </footer>
  );
}

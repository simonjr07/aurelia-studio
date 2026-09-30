"use client";

import Link from "next/link";

export default function ServicesError({ retry }: { retry: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-cream px-6 py-20 text-center text-ink">
      <div className="max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-clay">
          Studio catalogue
        </p>
        <h1 className="mt-5 font-display text-5xl tracking-[-0.035em]">
          We couldn&apos;t load the services.
        </h1>
        <p className="mt-5 leading-7 text-ink/60">
          The catalogue is temporarily unavailable. No private system details
          have been shown.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            className="min-h-12 rounded-full bg-ink px-6 text-sm font-semibold text-cream"
            onClick={() => retry()}
            type="button"
          >
            Try again
          </button>
          <Link
            className="inline-flex min-h-12 items-center rounded-full border border-ink/15 px-6 text-sm font-semibold"
            href="/"
          >
            Return home
          </Link>
        </div>
      </div>
    </main>
  );
}

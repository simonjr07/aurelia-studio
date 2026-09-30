import Link from "next/link";

export default function BookingNotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-cream px-6 text-center text-ink">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-clay">
          Booking unavailable
        </p>
        <h1 className="mt-5 font-display text-5xl">This service cannot be booked.</h1>
        <p className="mx-auto mt-5 max-w-lg leading-7 text-ink/60">
          It may no longer be offered. Browse the current studio services to
          choose another treatment.
        </p>
        <Link
          className="mt-8 inline-flex min-h-12 items-center rounded-full bg-ink px-7 font-semibold text-cream"
          href="/services"
        >
          View services
        </Link>
      </div>
    </main>
  );
}


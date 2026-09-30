import Link from "next/link";

import { formatDuration, formatPrice } from "@/lib/formatters";
import type { PublicServiceSummary } from "@/server/services/public-service-queries";

export function ServiceCard({
  service,
  index,
}: {
  service: PublicServiceSummary;
  index: number;
}) {
  return (
    <article className="group flex min-h-[25rem] flex-col rounded-[2rem] border border-ink/10 bg-white/55 p-7 shadow-[0_24px_70px_rgba(32,35,31,0.06)] transition duration-300 hover:-translate-y-1 hover:bg-white/75 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs font-semibold tracking-[0.2em] text-clay">
          {String(index + 1).padStart(2, "0")}
        </p>
        <p className="rounded-full border border-ink/10 px-3 py-1.5 text-xs font-semibold text-ink/55">
          {formatDuration(service.durationMinutes)}
        </p>
      </div>
      <h2 className="mt-14 font-display text-4xl leading-tight tracking-[-0.025em]">
        {service.name}
      </h2>
      <p className="mt-5 line-clamp-3 leading-7 text-ink/60">
        {service.description}
      </p>
      <div className="mt-auto flex items-end justify-between gap-5 pt-10">
        <p className="font-display text-2xl">
          {formatPrice(service.priceCents, service.currency)}
        </p>
        <Link
          aria-label={`View details for ${service.name}`}
          className="inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-cream transition group-hover:bg-clay"
          href={`/services/${service.slug}`}
        >
          View details
        </Link>
      </div>
    </article>
  );
}

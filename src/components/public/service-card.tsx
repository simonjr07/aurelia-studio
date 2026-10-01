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
    <article className="group relative flex min-h-[23rem] flex-col overflow-hidden border border-ink/10 bg-paper/65 p-7 transition duration-300 hover:-translate-y-1 hover:border-clay/30 hover:shadow-[0_24px_70px_rgba(39,36,31,0.08)] sm:p-8">
      <div className="absolute right-0 top-0 h-28 w-28 translate-x-10 -translate-y-10 rounded-full border border-clay/15 transition duration-500 group-hover:scale-125" aria-hidden="true" />
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs font-semibold tracking-[0.2em] text-clay">
          {String(index + 1).padStart(2, "0")}
        </p>
        <p className="rounded-full border border-ink/10 bg-cream/60 px-3 py-1.5 text-xs font-semibold text-ink/55">
          {formatDuration(service.durationMinutes)}
        </p>
      </div>
      <h2 className="mt-12 font-display text-4xl leading-[1.02] tracking-[-0.025em] sm:text-[2.75rem]">
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
          className="public-button-primary"
          href={`/services/${service.slug}`}
        >
          View details
        </Link>
      </div>
    </article>
  );
}

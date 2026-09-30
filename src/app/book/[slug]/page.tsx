import { DateTime } from "luxon";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";
import { getPrismaClient } from "@/server/db/prisma";
import { getPublicServiceBySlug } from "@/server/services/public-services";

import { BookingFlow } from "./booking-flow";

type BookingPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: BookingPageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = await getPublicServiceBySlug(slug);

  return service
    ? { title: `Book ${service.name} | Aurelia Studio` }
    : { title: "Book | Aurelia Studio" };
}

export default async function BookingPage({ params }: BookingPageProps) {
  const { slug } = await params;
  const [service, settings] = await Promise.all([
    getPublicServiceBySlug(slug),
    getPrismaClient().businessSettings.findUnique({
      where: { id: "default" },
      select: { timezone: true, bookingHorizonDays: true },
    }),
  ]);

  if (!service || !settings) {
    notFound();
  }

  const today = DateTime.now().setZone(settings.timezone).startOf("day");

  return (
    <main className="min-h-screen bg-cream text-ink">
      <PublicHeader />
      <section className="border-b border-ink/10 px-6 py-12 sm:px-10 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-clay">
            Reserve your visit
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl leading-none tracking-[-0.04em] sm:text-7xl">
            Book {service.name}
          </h1>
          <p className="mt-5 max-w-2xl leading-7 text-ink/65">
            Choose a professional and an available studio time. Your booking
            will be held as pending once confirmed.
          </p>
        </div>
      </section>
      <BookingFlow
        initialDate={today.toISODate()!}
        maximumDate={today.plus({ days: settings.bookingHorizonDays }).toISODate()!}
        service={service}
        timezone={settings.timezone}
      />
      <PublicFooter />
    </main>
  );
}


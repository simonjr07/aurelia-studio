import type { Metadata } from "next";

import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";

import { ManageBooking } from "./manage-booking";

export const metadata: Metadata = {
  title: "Manage your booking | Aurelia Studio",
  description: "Securely view an Aurelia Studio booking.",
  robots: { index: false, follow: false },
};

export default function ManageBookingPage() {
  return (
    <main className="min-h-screen bg-cream text-ink">
      <PublicHeader />
      <section className="border-b border-ink/10 px-6 py-14 sm:px-10 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-clay">
            Your appointment
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl leading-none tracking-[-0.04em] sm:text-7xl">
            Manage your booking
          </h1>
          <p className="mt-5 max-w-2xl leading-7 text-ink/65">
            Enter the reference from your confirmation and the email used when
            booking. No customer account is required.
          </p>
        </div>
      </section>
      <ManageBooking />
      <PublicFooter />
    </main>
  );
}


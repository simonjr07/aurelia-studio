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
    <main className="public-shell">
      <PublicHeader />
      <section className="border-b border-ink/10 bg-paper/30 py-14 sm:py-20">
        <div className="public-container max-w-6xl">
          <p className="public-eyebrow">
            Your appointment
          </p>
          <h1 className="public-display mt-4 max-w-4xl text-[3.25rem] leading-[0.95] sm:text-7xl">
            Manage your booking
          </h1>
          <p className="mt-5 max-w-2xl leading-7 text-ink/65">
            Review the details of your visit, or make an eligible change, using the private reference from your confirmation and your booking email.
          </p>
        </div>
      </section>
      <ManageBooking />
      <PublicFooter />
    </main>
  );
}


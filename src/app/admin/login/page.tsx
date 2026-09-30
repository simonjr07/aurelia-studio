import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/server/auth/current-user";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Staff sign in | Aurelia Studio",
  description: "Secure sign in for the Aurelia Studio workspace.",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect("/admin");
  }

  return (
    <main className="grid min-h-screen bg-cream text-ink lg:grid-cols-[0.9fr_1.1fr]">
      <section className="relative hidden overflow-hidden bg-sage p-12 lg:flex lg:flex-col lg:justify-between">
        <Link
          className="font-display text-xl tracking-[0.18em]"
          href="/"
        >
          AURELIA
        </Link>
        <div className="relative z-10 max-w-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cream/80">
            Internal workspace
          </p>
          <p className="mt-5 font-display text-5xl leading-tight text-cream">
            Calm operations support thoughtful care.
          </p>
        </div>
        <div
          aria-hidden="true"
          className="absolute -bottom-28 -right-24 h-96 w-96 rounded-full border border-cream/35"
        />
      </section>

      <section className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <Link
            className="font-display text-xl tracking-[0.18em] lg:hidden"
            href="/"
          >
            AURELIA
          </Link>
          <p className="mt-12 text-xs font-semibold uppercase tracking-[0.24em] text-clay lg:mt-0">
            Aurelia Studio workspace
          </p>
          <h1 className="mt-4 font-display text-5xl tracking-[-0.035em]">
            Staff sign in
          </h1>
          <p className="mt-4 leading-7 text-ink/60">
            Use your staff credentials to access the internal workspace.
          </p>

          <LoginForm />

          <Link
            className="mt-8 inline-flex text-sm font-semibold underline decoration-clay/45 underline-offset-8 hover:decoration-clay"
            href="/"
          >
            Return to the public site
          </Link>
        </div>
      </section>
    </main>
  );
}

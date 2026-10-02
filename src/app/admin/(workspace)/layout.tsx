import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { requireStaff } from "@/server/auth/access";

import { logoutAction } from "./actions";
import { WorkspaceNavigation } from "./workspace-navigation";

export const metadata: Metadata = {
  title: {
    default: "Workspace | Aurelia Studio",
    template: "%s | Aurelia Studio",
  },
  robots: { index: false, follow: false },
};

export default async function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireStaff();

  return (
    <div className="admin-shell lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="border-b border-ink/10 bg-cream px-4 py-4 lg:min-h-screen lg:border-b-0 lg:border-r lg:px-6 lg:py-8">
        <div className="flex flex-col gap-4 lg:block">
          <Link
            className="font-display text-lg tracking-[0.18em]"
            href="/admin"
          >
            AURELIA
          </Link>
          <div className="mt-5 lg:mt-12">
            <WorkspaceNavigation role={user.role} />
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="flex min-h-20 items-center justify-between gap-5 border-b border-ink/10 bg-white/70 px-4 py-4 backdrop-blur sm:px-10">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink/50">
              {user.role}
            </p>
          </div>
          <form action={logoutAction}>
            <button
              className="admin-button-secondary"
              type="submit"
            >
              Sign out
            </button>
          </form>
        </header>
        {children}
      </div>
    </div>
  );
}

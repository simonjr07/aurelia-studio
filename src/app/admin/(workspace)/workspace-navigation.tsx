"use client";

import type { Role } from "@/generated/prisma/client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems: Array<{
  label: string;
  href: string;
  roles: Role[];
}> = [
  {
    label: "Overview",
    href: "/admin",
    roles: ["STAFF", "ADMIN"],
  },
  {
    label: "Appointments",
    href: "/admin/appointments",
    roles: ["STAFF", "ADMIN"],
  },
  { label: "Services", href: "/admin/services", roles: ["ADMIN"] },
  { label: "Staff", href: "/admin/staff", roles: ["ADMIN"] },
  { label: "Availability", href: "/admin/availability", roles: ["STAFF", "ADMIN"] },
  { label: "Analytics", href: "/admin/analytics", roles: ["ADMIN"] },
];

export function WorkspaceNavigation({ role }: { role: Role }) {
  const pathname = usePathname();
  const visibleItems = navigationItems.filter((item) =>
    item.roles.includes(role),
  );

  return (
    <nav aria-label="Workspace navigation">
      <ul className="flex max-w-full gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {visibleItems.map((item) => (
          <li key={item.href}>
            <Link
              aria-current={pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`)) ? "page" : undefined}
              className={`flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-semibold transition lg:rounded-xl ${pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`)) ? "bg-ink text-cream" : "border border-ink/15 bg-white/40 text-ink/70 hover:border-clay/40 hover:text-ink"}`}
              href={item.href}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

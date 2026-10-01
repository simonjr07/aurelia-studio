import type { Role } from "@/generated/prisma/client";
import Link from "next/link";

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
];

export function WorkspaceNavigation({ role }: { role: Role }) {
  const visibleItems = navigationItems.filter((item) =>
    item.roles.includes(role),
  );

  return (
    <nav aria-label="Workspace navigation">
      <ul className="flex gap-2 lg:flex-col">
        {visibleItems.map((item) => (
          <li key={item.href}>
            <Link
              className="flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-cream lg:rounded-xl"
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

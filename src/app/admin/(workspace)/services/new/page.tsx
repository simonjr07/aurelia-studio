import Link from "next/link";
import { requireAdmin } from "@/server/auth/access";
import { ServiceForm } from "../service-form";

export const metadata = { title: "New service" };
export default async function NewServicePage() {
  await requireAdmin();
  return <main className="px-6 py-10 sm:px-10 sm:py-14"><div className="mx-auto max-w-4xl"><Link className="text-sm font-semibold underline" href="/admin/services">← Services</Link><h1 className="mt-6 font-display text-5xl">New service</h1><ServiceForm /></div></main>;
}


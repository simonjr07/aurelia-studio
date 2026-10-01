import Link from "next/link";
import { requireAdmin } from "@/server/auth/access";
import { StaffCreateForm } from "../staff-create-form";
export const metadata = { title: "New staff account" };
export default async function NewStaffPage() { await requireAdmin(); return <main className="px-6 py-10 sm:px-10 sm:py-14"><div className="mx-auto max-w-3xl"><Link className="text-sm font-semibold underline" href="/admin/staff">← Staff</Link><h1 className="mt-6 font-display text-5xl">New staff account</h1><StaffCreateForm /></div></main>; }


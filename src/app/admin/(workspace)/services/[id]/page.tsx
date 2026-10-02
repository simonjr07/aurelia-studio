import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/access";
import { getManagedService } from "@/server/management/management-service";
import { ServiceForm } from "../service-form";

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireAdmin();
  const service = await getManagedService(actor, (await params).id);
  if (!service) notFound();
  return <main className="admin-main"><div className="mx-auto max-w-4xl"><Link className="text-sm font-semibold underline" href="/admin/services">← Services</Link><h1 className="mt-6 font-display text-5xl">Edit service</h1><ServiceForm service={service} /></div></main>;
}


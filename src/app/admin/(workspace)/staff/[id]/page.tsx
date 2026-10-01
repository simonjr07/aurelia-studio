import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/access";
import { getManagedStaff } from "@/server/management/management-service";
import { StaffEditForm } from "../staff-edit-form";
export default async function EditStaffPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireAdmin(); const staff = await getManagedStaff(actor, (await params).id); if (!staff) notFound();
  return <main className="px-6 py-10 sm:px-10 sm:py-14"><div className="mx-auto max-w-4xl"><Link className="text-sm font-semibold underline" href="/admin/staff">← Staff</Link><h1 className="mt-6 font-display text-5xl">{staff.name}</h1><StaffEditForm staff={{ ...staff, assignedIds: staff.staffServices.map((item) => item.serviceId) }} /></div></main>;
}


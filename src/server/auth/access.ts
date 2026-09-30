import "server-only";

import { redirect } from "next/navigation";

import { assertAdminRole, assertStaffRole } from "./authorization-policy";
import { getCurrentUser } from "./current-user";

export async function requireAuthenticatedUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/admin/login");
  }

  return user;
}

export async function requireStaff() {
  const user = await requireAuthenticatedUser();
  assertStaffRole(user);
  return user;
}

export async function requireAdmin() {
  const user = await requireAuthenticatedUser();
  assertAdminRole(user);
  return user;
}

export { AuthorizationError } from "./authorization-policy";

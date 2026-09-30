import type { Role } from "@/generated/prisma/client";

import type { CurrentUser } from "./current-user-service";

export class AuthorizationError extends Error {
  constructor(message = "You are not authorized to perform this action.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export function assertStaffRole(user: Pick<CurrentUser, "role">) {
  const allowedRoles: Role[] = ["STAFF", "ADMIN"];

  if (!allowedRoles.includes(user.role)) {
    throw new AuthorizationError();
  }
}

export function assertAdminRole(user: Pick<CurrentUser, "role">) {
  if (user.role !== "ADMIN") {
    throw new AuthorizationError();
  }
}

import type { Role, UserStatus } from "@/generated/prisma/client";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type CurrentUserRecord = CurrentUser & {
  status: UserStatus;
};

export type CurrentUserRepository = {
  findById(id: string): Promise<CurrentUserRecord | null>;
};

export async function resolveCurrentUser(
  sessionUserId: string | undefined,
  users: CurrentUserRepository,
): Promise<CurrentUser | null> {
  if (!sessionUserId) {
    return null;
  }

  const user = await users.findById(sessionUserId);

  if (!user || user.status !== "ACTIVE") {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

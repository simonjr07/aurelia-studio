import "server-only";

import { cache } from "react";

import { auth } from "@/auth";

import { resolveCurrentUser } from "./current-user-service";
import { currentUserRepository } from "./user-repository";

export const getCurrentUser = cache(async () => {
  try {
    const session = await auth();
    const sessionUserId = session?.user?.id;
    return await resolveCurrentUser(sessionUserId, currentUserRepository);
  } catch {
    return null;
  }
});

import "server-only";

import { getPrismaClient } from "@/server/db/prisma";

import type {
  CredentialUserRecord,
  CredentialUserRepository,
} from "./credentials";
import type {
  CurrentUserRecord,
  CurrentUserRepository,
} from "./current-user-service";

export const credentialUserRepository: CredentialUserRepository = {
  async findByEmail(email): Promise<CredentialUserRecord | null> {
    return getPrismaClient().user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        passwordHash: true,
      },
    });
  },
};

export const currentUserRepository: CurrentUserRepository = {
  async findById(id): Promise<CurrentUserRecord | null> {
    return getPrismaClient().user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });
  },
};

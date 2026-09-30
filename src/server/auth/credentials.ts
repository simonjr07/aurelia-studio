import { compare } from "bcrypt";

import type { Role, UserStatus } from "@/generated/prisma/client";

import { loginCredentialsSchema } from "./validation";

const DUMMY_PASSWORD_HASH =
  "$2b$12$uic7U9yGBbtbpOT5/O.v1eGiEqocIDh9Fc2xP4yS0sp16nBI7x2Ku";

export type SafeAuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type CredentialUserRecord = SafeAuthUser & {
  passwordHash: string;
  status: UserStatus;
};

export type CredentialUserRepository = {
  findByEmail(email: string): Promise<CredentialUserRecord | null>;
};

type CredentialDependencies = {
  users: CredentialUserRepository;
  comparePassword?: (password: string, hash: string) => Promise<boolean>;
};

export async function authenticateCredentials(
  credentials: unknown,
  { users, comparePassword = compare }: CredentialDependencies,
): Promise<SafeAuthUser | null> {
  const parsed = loginCredentialsSchema.safeParse(credentials);

  if (!parsed.success) {
    return null;
  }

  const user = await users.findByEmail(parsed.data.email);
  const passwordMatches = await comparePassword(
    parsed.data.password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );

  if (!user || !passwordMatches || user.status !== "ACTIVE") {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

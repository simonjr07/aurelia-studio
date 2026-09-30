import { hash } from "bcrypt";

import type { SafeAuthUser } from "./credentials";
import { adminProvisionSchema } from "./validation";

export const BCRYPT_WORK_FACTOR = 12;
export const PRODUCTION_CONFIRMATION_PHRASE =
  "PROVISION_AURELIA_ADMIN_IN_PRODUCTION";

export class ProvisioningError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProvisioningError";
  }
}

export type AdminProvisionRepository = {
  findByEmail(email: string): Promise<{ id: string } | null>;
  createAdmin(input: {
    name: string;
    email: string;
    passwordHash: string;
  }): Promise<SafeAuthUser>;
};

type ProvisionEnvironment = {
  NODE_ENV?: string;
  ADMIN_PROVISION_MODE?: string;
  ADMIN_PROVISION_CONFIRM?: string;
};

export function assertProvisioningEnvironment(environment: ProvisionEnvironment) {
  if (environment.NODE_ENV !== "production") {
    return;
  }

  if (
    environment.ADMIN_PROVISION_MODE !== "production" ||
    environment.ADMIN_PROVISION_CONFIRM !== PRODUCTION_CONFIRMATION_PHRASE
  ) {
    throw new ProvisioningError(
      "Production provisioning requires the explicit production mode and confirmation phrase.",
    );
  }
}

export async function provisionAdmin(
  input: unknown,
  environment: ProvisionEnvironment,
  repository: AdminProvisionRepository,
  hashPassword: (password: string, rounds: number) => Promise<string> = hash,
) {
  assertProvisioningEnvironment(environment);

  const parsed = adminProvisionSchema.safeParse(input);

  if (!parsed.success) {
    throw new ProvisioningError("Administrator details are invalid.");
  }

  const existing = await repository.findByEmail(parsed.data.email);

  if (existing) {
    throw new ProvisioningError(
      "An account with that normalized email already exists.",
    );
  }

  const passwordHash = await hashPassword(
    parsed.data.password,
    BCRYPT_WORK_FACTOR,
  );

  return repository.createAdmin({
    name: parsed.data.name,
    email: parsed.data.email,
    passwordHash,
  });
}

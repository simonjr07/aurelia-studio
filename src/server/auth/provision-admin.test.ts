import { compare, hash } from "bcrypt";
import { describe, expect, it, vi } from "vitest";

import {
  BCRYPT_WORK_FACTOR,
  PRODUCTION_CONFIRMATION_PHRASE,
  provisionAdmin,
  ProvisioningError,
  type AdminProvisionRepository,
} from "./provision-admin";

function createRepository(): AdminProvisionRepository & {
  records: Array<{ name: string; email: string; passwordHash: string }>;
} {
  const records: Array<{
    name: string;
    email: string;
    passwordHash: string;
  }> = [];

  return {
    records,
    async findByEmail(email) {
      return records.some((record) => record.email === email)
        ? { id: "existing" }
        : null;
    },
    async createAdmin(input) {
      records.push(input);
      return {
        id: "new-admin",
        name: input.name,
        email: input.email,
        role: "ADMIN",
      };
    },
  };
}

const validInput = {
  name: "First Admin",
  email: "  ADMIN@AURELIA.TEST ",
  password: "correct horse battery staple",
};

describe("administrator provisioning", () => {
  it("creates an active admin input with a normalized email and hashed password", async () => {
    const repository = createRepository();
    const hashPassword = vi.fn((password: string) => hash(password, 4));

    const result = await provisionAdmin(
      validInput,
      { NODE_ENV: "development" },
      repository,
      hashPassword,
    );

    expect(result.role).toBe("ADMIN");
    expect(repository.records[0]?.email).toBe("admin@aurelia.test");
    expect(repository.records[0]?.passwordHash).not.toBe(validInput.password);
    await expect(
      compare(validInput.password, repository.records[0]!.passwordHash),
    ).resolves.toBe(true);
    expect(hashPassword).toHaveBeenCalledWith(
      validInput.password,
      BCRYPT_WORK_FACTOR,
    );
  });

  it("rejects a duplicate normalized email without modifying it", async () => {
    const repository = createRepository();
    repository.records.push({
      name: "Existing",
      email: "admin@aurelia.test",
      passwordHash: "existing-hash",
    });

    await expect(
      provisionAdmin(
        validInput,
        { NODE_ENV: "development" },
        repository,
      ),
    ).rejects.toThrow(ProvisioningError);

    expect(repository.records).toHaveLength(1);
  });

  it("rejects unsafe production execution", async () => {
    await expect(
      provisionAdmin(validInput, { NODE_ENV: "production" }, createRepository()),
    ).rejects.toThrow(ProvisioningError);
  });

  it("accepts the exact production guards", async () => {
    const repository = createRepository();

    await expect(
      provisionAdmin(
        validInput,
        {
          NODE_ENV: "production",
          ADMIN_PROVISION_MODE: "production",
          ADMIN_PROVISION_CONFIRM: PRODUCTION_CONFIRMATION_PHRASE,
        },
        repository,
        vi.fn(async () => "secure-hash"),
      ),
    ).resolves.toMatchObject({ role: "ADMIN" });
  });
});

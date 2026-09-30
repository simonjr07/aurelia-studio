import { describe, expect, it, vi } from "vitest";

import {
  authenticateCredentials,
  type CredentialUserRecord,
  type CredentialUserRepository,
} from "./credentials";

const activeUser: CredentialUserRecord = {
  id: "b9d15aac-e9f0-43a2-b06d-354737d023ab",
  name: "Aurelia Admin",
  email: "admin@aurelia.test",
  passwordHash: "stored-hash",
  role: "ADMIN",
  status: "ACTIVE",
};

function repositoryFor(user: CredentialUserRecord | null) {
  return {
    findByEmail: vi.fn(async () => user),
  } satisfies CredentialUserRepository;
}

describe("credential authentication", () => {
  it("authenticates an ACTIVE user and returns safe fields only", async () => {
    const result = await authenticateCredentials(
      { email: "  ADMIN@AURELIA.TEST ", password: "correct-password" },
      {
        users: repositoryFor(activeUser),
        comparePassword: vi.fn(async () => true),
      },
    );

    expect(result).toEqual({
      id: activeUser.id,
      name: activeUser.name,
      email: activeUser.email,
      role: "ADMIN",
    });
    expect(result).not.toHaveProperty("passwordHash");
  });

  it("normalizes email before lookup", async () => {
    const users = repositoryFor(activeUser);

    await authenticateCredentials(
      { email: "  ADMIN@AURELIA.TEST ", password: "password" },
      { users, comparePassword: vi.fn(async () => true) },
    );

    expect(users.findByEmail).toHaveBeenCalledWith("admin@aurelia.test");
  });

  it("rejects a wrong password", async () => {
    await expect(
      authenticateCredentials(
        { email: activeUser.email, password: "wrong-password" },
        {
          users: repositoryFor(activeUser),
          comparePassword: vi.fn(async () => false),
        },
      ),
    ).resolves.toBeNull();
  });

  it("rejects an unknown email while still performing a password comparison", async () => {
    const comparePassword = vi.fn(async () => false);

    await expect(
      authenticateCredentials(
        { email: "missing@aurelia.test", password: "password" },
        { users: repositoryFor(null), comparePassword },
      ),
    ).resolves.toBeNull();

    expect(comparePassword).toHaveBeenCalledOnce();
  });

  it("rejects a DISABLED user", async () => {
    await expect(
      authenticateCredentials(
        { email: activeUser.email, password: "correct-password" },
        {
          users: repositoryFor({ ...activeUser, status: "DISABLED" }),
          comparePassword: vi.fn(async () => true),
        },
      ),
    ).resolves.toBeNull();
  });
});

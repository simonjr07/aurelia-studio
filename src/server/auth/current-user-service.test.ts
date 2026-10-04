import { describe, expect, it, vi } from "vitest";

import {
  resolveCurrentUser,
  type CurrentUserRecord,
  type CurrentUserRepository,
} from "./current-user-service";

const activeUser: CurrentUserRecord = {
  id: "818ee93f-6acd-4a2a-9b36-fae0d0f0c52d",
  name: "Aurelia Staff",
  email: "staff@aurelia.test",
  role: "STAFF",
  status: "ACTIVE",
};

describe("current user database recheck", () => {
  it("returns an active user without status or sensitive fields", async () => {
    const users: CurrentUserRepository = {
      findById: vi.fn(async () => activeUser),
    };

    await expect(resolveCurrentUser(activeUser.id, users)).resolves.toEqual({
      id: activeUser.id,
      name: activeUser.name,
      email: activeUser.email,
      role: "STAFF",
    });
  });

  it("treats a disabled user as unavailable", async () => {
    const users: CurrentUserRepository = {
      findById: vi.fn(async () => ({
        ...activeUser,
        status: "DISABLED" as const,
      })),
    };

    await expect(resolveCurrentUser(activeUser.id, users)).resolves.toBeNull();
  });

  it("treats a deleted or missing user as unavailable", async () => {
    const users: CurrentUserRepository = {
      findById: vi.fn(async () => null),
    };

    await expect(resolveCurrentUser(activeUser.id, users)).resolves.toBeNull();
  });

  it("reflects a database role change on the next resolution", async () => {
    let role: CurrentUserRecord["role"] = "STAFF";
    const users: CurrentUserRepository = {
      findById: vi.fn(async () => ({ ...activeUser, role })),
    };

    await expect(resolveCurrentUser(activeUser.id, users)).resolves.toMatchObject({
      role: "STAFF",
    });

    role = "ADMIN";

    await expect(resolveCurrentUser(activeUser.id, users)).resolves.toMatchObject({
      role: "ADMIN",
    });
  });
});

import { describe, expect, it } from "vitest";

import {
  assertAdminRole,
  assertStaffRole,
  AuthorizationError,
} from "./authorization-policy";

describe("authorization policy", () => {
  it.each(["STAFF", "ADMIN"] as const)(
    "allows %s into the operational workspace",
    (role) => {
      expect(() => assertStaffRole({ role })).not.toThrow();
    },
  );

  it("allows ADMIN through an admin boundary", () => {
    expect(() => assertAdminRole({ role: "ADMIN" })).not.toThrow();
  });

  it("rejects STAFF at an admin boundary", () => {
    expect(() => assertAdminRole({ role: "STAFF" })).toThrow(
      AuthorizationError,
    );
  });
});

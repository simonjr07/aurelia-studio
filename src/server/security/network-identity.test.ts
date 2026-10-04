import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getTrustedNetworkIdentity } from "./network-identity";

const originalVercel = process.env.VERCEL;

afterEach(() => {
  if (originalVercel === undefined) {
    delete process.env.VERCEL;
  } else {
    process.env.VERCEL = originalVercel;
  }
});

describe("trusted network identity", () => {
  it("uses Vercel's proxy header when running on Vercel", () => {
    process.env.VERCEL = "1";

    expect(
      getTrustedNetworkIdentity(
        new Request("https://studio.example.test", {
          headers: { "x-vercel-forwarded-for": "203.0.113.4, 10.0.0.1" },
        }),
      ),
    ).toBe("203.0.113.4");
  });

  it("does not trust client supplied forwarding headers outside Vercel", () => {
    delete process.env.VERCEL;

    expect(
      getTrustedNetworkIdentity(
        new Request("https://studio.example.test", {
          headers: { "x-forwarded-for": "203.0.113.4" },
        }),
      ),
    ).toBeUndefined();
  });
});

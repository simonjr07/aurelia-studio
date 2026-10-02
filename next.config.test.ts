import { describe, expect, it } from "vitest";

import nextConfig from "./next.config";

describe("production response headers", () => {
  it("disables framework disclosure and configures baseline browser protections", async () => {
    expect(nextConfig.poweredByHeader).toBe(false);

    const rules = await nextConfig.headers?.();
    const headers = rules?.[0]?.headers ?? [];
    const values = new Map(headers.map((header) => [header.key, header.value]));

    expect(values.get("X-Content-Type-Options")).toBe("nosniff");
    expect(values.get("X-Frame-Options")).toBe("DENY");
    expect(values.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(values.get("Content-Security-Policy")).toContain(
      "frame-ancestors 'none'",
    );
  });
});

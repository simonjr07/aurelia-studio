import { describe, expect, it } from "vitest";
import { normalizeServiceSlug, parseMoneyToCents } from "./validation";

describe("management validation", () => {
  it.each([
    ["0.00", 0], ["10", 1000], ["10.5", 1050], ["10.50", 1050], ["999.99", 99999],
  ])("parses %s without floating point arithmetic", (input, expected) => {
    expect(parseMoneyToCents(input)).toBe(expected);
  });

  it.each(["-1", "10.001", "ten", "", "1000000.01", "9007199254740991"])("rejects invalid or unbounded amount %s", (input) => {
    expect(parseMoneyToCents(input)).toBeNull();
  });

  it("normalizes a stable lowercase URL slug", () => {
    expect(normalizeServiceSlug("  Éclat Signature / Facial  ")).toBe("eclat-signature-facial");
  });
});


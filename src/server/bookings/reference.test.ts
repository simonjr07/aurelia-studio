import { describe, expect, it } from "vitest";

import {
  BOOKING_REFERENCE_PATTERN,
  createBookingReference,
} from "./reference";

describe("booking references", () => {
  it("generates compact URL safe references with 96 random bits", () => {
    const references = new Set(
      Array.from({ length: 2_000 }, () => createBookingReference()),
    );

    expect(references.size).toBe(2_000);
    for (const reference of references) {
      expect(reference).toMatch(BOOKING_REFERENCE_PATTERN);
      expect(reference).toHaveLength(20);
    }
  });

  it("uses the supplied cryptographic byte source deterministically in tests", () => {
    expect(createBookingReference(() => Buffer.alloc(12, 0))).toBe(
      "AUR-AAAAAAAAAAAAAAAA",
    );
    expect(createBookingReference(() => Buffer.alloc(12, 1))).toBe(
      "AUR-AQEBAQEBAQEBAQEB",
    );
  });
});


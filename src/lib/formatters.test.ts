import { describe, expect, it } from "vitest";

import { formatDuration, formatPrice } from "./formatters";

describe("public service formatters", () => {
  it("formats USD integer cents", () => {
    expect(formatPrice(5_000, "USD")).toBe("$50.00");
  });

  it.each([
    [30, "30 min"],
    [60, "1 hr"],
    [90, "1 hr 30 min"],
    [120, "2 hr"],
  ])("formats %i minutes as %s", (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected);
  });
});

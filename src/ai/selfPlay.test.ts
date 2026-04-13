import { describe, expect, it } from "vitest";
import { linearDecayFactor } from "./selfPlay";

describe("linearDecayFactor", () => {
  it("is 1 for a single-game batch", () => {
    expect(linearDecayFactor(0, 1)).toBe(1);
  });

  it("goes from 1 to 0 across the batch", () => {
    expect(linearDecayFactor(0, 5)).toBe(1);
    expect(linearDecayFactor(4, 5)).toBe(0);
    expect(linearDecayFactor(2, 5)).toBeCloseTo(0.5);
  });

  it("is 1 for non-positive total (degenerate)", () => {
    expect(linearDecayFactor(0, 0)).toBe(1);
  });
});

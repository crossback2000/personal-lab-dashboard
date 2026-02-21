import { describe, expect, it } from "vitest";
import { normalizeObservationValue } from "@/lib/normalization";

describe("normalizeObservationValue", () => {
  it("calculates normalized value in range", () => {
    expect(
      normalizeObservationValue({
        value_numeric: 85,
        ref_low: 70,
        ref_high: 100
      })
    ).toBe(0.5);
  });

  it("returns null when normalization cannot be calculated", () => {
    expect(
      normalizeObservationValue({
        value_numeric: null,
        ref_low: 70,
        ref_high: 100
      })
    ).toBeNull();

    expect(
      normalizeObservationValue({
        value_numeric: 90,
        ref_low: 100,
        ref_high: 100
      })
    ).toBeNull();
  });

  it("clamps below-range values to 0 and above-range values to 1", () => {
    expect(
      normalizeObservationValue({
        value_numeric: 60,
        ref_low: 70,
        ref_high: 100
      })
    ).toBe(0);

    expect(
      normalizeObservationValue({
        value_numeric: 120,
        ref_low: 70,
        ref_high: 100
      })
    ).toBe(1);
  });
});

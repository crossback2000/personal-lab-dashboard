import { describe, expect, it } from "vitest";
import { normalizeObservationValue } from "@/lib/normalization";

describe("normalizeObservationValue", () => {
  it("uses midpoint as 0 and range bounds as -1/+1", () => {
    expect(
      normalizeObservationValue({
        value_numeric: 85,
        ref_low: 70,
        ref_high: 100
      })
    ).toBe(0);

    expect(
      normalizeObservationValue({
        value_numeric: 70,
        ref_low: 70,
        ref_high: 100
      })
    ).toBe(-1);

    expect(
      normalizeObservationValue({
        value_numeric: 100,
        ref_low: 70,
        ref_high: 100
      })
    ).toBe(1);
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

  it("does not clamp out-of-range values", () => {
    expect(
      normalizeObservationValue({
        value_numeric: 60,
        ref_low: 70,
        ref_high: 100
      })
    ).toBeCloseTo(-1.6666667, 6);

    expect(
      normalizeObservationValue({
        value_numeric: 120,
        ref_low: 70,
        ref_high: 100
      })
    ).toBeCloseTo(2.3333333, 6);
  });
});

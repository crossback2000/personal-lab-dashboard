import { describe, expect, it } from "vitest";
import { findTestExplanation } from "@/lib/test-explanations";

describe("findTestExplanation", () => {
  it("matches by exact Korean test name", () => {
    const explanation = findTestExplanation(["단백/크레아티닌 비(소변)"]);

    expect(explanation?.test).toBe("단백/크레아티닌 비(소변)");
  });

  it("matches by English alias even when symbols are included", () => {
    const explanation = findTestExplanation([
      "MCHC (Mean Corpuscular Hemoglobin Concentration)"
    ]);

    expect(explanation?.test).toBe("평균 적혈구 혈색소 농도 (MCHC)");
  });

  it("returns null when no known explanation exists", () => {
    const explanation = findTestExplanation(["Unknown Marker XYZ"]);

    expect(explanation).toBeNull();
  });
});

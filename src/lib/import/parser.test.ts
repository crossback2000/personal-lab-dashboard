import { describe, expect, it } from "vitest";
import { parsePastedLabText } from "@/lib/import/parser";

describe("parsePastedLabText", () => {
  it("parses tabular rows with multiple date columns and arrow flags", () => {
    const input = [
      "검사항목\tUnit\t참고치\t2025-01-10\t2025-02-10",
      "Hemoglobin(혈색소)\tg/dL\t13.0~17.0\t12.5▼\t13.3",
      "Urine SG(요비중)\t\t1.005~1.030\t1.025\t1.032▲"
    ].join("\n");

    const parsed = parsePastedLabText(input);

    expect(parsed).toHaveLength(4);
    expect(parsed[0]).toMatchObject({
      testNameKo: "혈색소",
      observedAt: "2025-01-10",
      valueNumeric: 12.5,
      flag: "L",
      refLow: 13,
      refHigh: 17
    });
    expect(parsed[3]).toMatchObject({
      testNameKo: "요비중",
      observedAt: "2025-02-10",
      valueNumeric: 1.032,
      flag: "H"
    });
  });

  it("parses inline date-value groups from a single line", () => {
    const input = "요산 UricAcid mg/dL 2.6~7.0 2025-01-03 5.1 2025-02-01 7.3▲ 2025-02-15 6.4";

    const parsed = parsePastedLabText(input);

    expect(parsed).toHaveLength(3);
    expect(parsed[1]).toMatchObject({
      observedAt: "2025-02-01",
      valueNumeric: 7.3,
      flag: "H",
      unit: "mg/dL",
      refLow: 2.6,
      refHigh: 7
    });
  });

  it("parses grouped hospital paste format with separated date/result/range blocks", () => {
    const input = [
      "검사결과",
      "요검사(검사일 : 2025.02.21 ~ 2026.02.20)",
      "검사명\t한글명\t검사일\t결과\t단위\t정상범위",
      "Specific Gravity\t비중\t",
      "2026-01-30",
      "2025-10-16",
      "2025-08-04",
      "1.008 ▼",
      "1.022",
      "1.024",
      "(1.01~1.03)",
      "(1.01~1.03)",
      "(1.01~1.03)",
      "pH\t산도\t",
      "2026-01-30",
      "2025-10-16",
      "2025-08-04",
      "7.0",
      "6.0",
      "6.0",
      "(5~8)",
      "(5~8)",
      "(5~8)"
    ].join("\n");

    const parsed = parsePastedLabText(input);

    expect(parsed).toHaveLength(6);
    expect(parsed[0]).toMatchObject({
      testNameEn: "Specific Gravity",
      testNameKo: "비중",
      categoryHint: "urinalysis",
      observedAt: "2026-01-30",
      valueNumeric: 1.008,
      flag: "L",
      refLow: 1.01,
      refHigh: 1.03
    });
    expect(parsed[5]).toMatchObject({
      testNameEn: "pH",
      testNameKo: "산도",
      observedAt: "2025-08-04",
      valueNumeric: 6,
      flag: null,
      refLow: 5,
      refHigh: 8
    });
  });

  it("parses panel header category and per-date units from grouped CBC format", () => {
    const input = [
      "검사결과",
      "일반혈액(검사일 : 2025.02.22 ~ 2026.02.21)",
      "검사명\t한글명\t검사일\t결과\t단위\t정상범위",
      "WBC Count, Blood\t백혈구 (WBC)\t",
      "2026-01-30",
      "2025-08-04",
      "3.97",
      "5.31",
      "x10³/μL",
      "x10³/μL",
      "(3.8~10.58)",
      "(3.8~10.58)",
      "MCHC (Mean Corpuscular Hemoglobin Concentration)\t평균 적혈구 혈색소 농도 (MCHC)\t",
      "2026-01-30",
      "2025-08-04",
      "35.6 ▲",
      "33.8",
      "g/dL",
      "g/dL",
      "(32.3~34.9)",
      "(32.3~34.9)"
    ].join("\n");

    const parsed = parsePastedLabText(input);

    expect(parsed).toHaveLength(4);
    expect(parsed[0]).toMatchObject({
      testNameEn: "WBC Count, Blood",
      testNameKo: "백혈구 (WBC)",
      categoryHint: "general_blood",
      observedAt: "2026-01-30",
      valueNumeric: 3.97,
      unit: "x10³/μL",
      refLow: 3.8,
      refHigh: 10.58
    });
    expect(parsed[2]).toMatchObject({
      testNameEn: "MCHC (Mean Corpuscular Hemoglobin Concentration)",
      testNameKo: "평균 적혈구 혈색소 농도 (MCHC)",
      categoryHint: "general_blood",
      observedAt: "2026-01-30",
      valueNumeric: 35.6,
      flag: "H",
      unit: "g/dL",
      refLow: 32.3,
      refHigh: 34.9
    });
  });

  it("parses grouped chemistry-urine format with compatibility-unit symbols", () => {
    const input = [
      "일반화학(요)(검사일 : 2025.02.22 ~ 2026.02.21)",
      "검사명\t한글명\t검사일\t결과\t단위\t정상범위",
      "Protein, Random Urine\t\t",
      "2026-01-30",
      "2025-10-16",
      "2025-08-04",
      "25.85 ▲",
      "31.61 ▲",
      "30.49 ▲",
      "㎎/㎗",
      "㎎/㎗",
      "㎎/㎗",
      "(1~14)",
      "(1~14)",
      "(1~14)",
      "Creatinine, Random Urine\t크레아티닌(소변)\t",
      "2026-01-30",
      "2025-10-16",
      "2025-08-04",
      "74.24",
      "169.18",
      "242.71",
      "㎎/dL",
      "㎎/dL",
      "㎎/dL",
      "(~)",
      "(~)",
      "(~)",
      "Protein/Creatinine Ratio, Urine\t단백/크레아티닌 비(소변)\t",
      "2026-01-30",
      "2025-10-16",
      "2025-08-04",
      "0.35 ▲",
      "0.19",
      "0.13",
      "㎎/㎎Cr",
      "㎎/㎎Cr",
      "㎎/㎎Cr",
      "(0~0.2)",
      "(0~0.2)",
      "(0~0.2)"
    ].join("\n");

    const parsed = parsePastedLabText(input);

    expect(parsed).toHaveLength(9);
    expect(parsed[0]).toMatchObject({
      testNameEn: "Protein, Random Urine",
      categoryHint: "urinalysis",
      observedAt: "2026-01-30",
      valueNumeric: 25.85,
      flag: "H",
      unit: "㎎/㎗",
      refLow: 1,
      refHigh: 14
    });
    expect(parsed[3]).toMatchObject({
      testNameEn: "Creatinine, Random Urine",
      testNameKo: "크레아티닌(소변)",
      observedAt: "2026-01-30",
      valueNumeric: 74.24,
      unit: "㎎/dL",
      refLow: null,
      refHigh: null
    });
    expect(parsed[6]).toMatchObject({
      testNameEn: "Protein/Creatinine Ratio, Urine",
      testNameKo: "단백/크레아티닌 비(소변)",
      observedAt: "2026-01-30",
      valueNumeric: 0.35,
      flag: "H",
      unit: "㎎/㎎Cr",
      refLow: 0,
      refHigh: 0.2
    });
  });
});

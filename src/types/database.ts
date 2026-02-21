export type ObservationFlag = "H" | "L" | null;

export type LabCategory =
  | "general_blood"
  | "chemistry"
  | "coagulation"
  | "urinalysis"
  | "other";

export const CATEGORY_LABELS: Record<LabCategory, string> = {
  general_blood: "일반혈액",
  chemistry: "일반화학",
  coagulation: "응고",
  urinalysis: "요검사",
  other: "기타"
};

export interface TestRow {
  id: string;
  name_en: string;
  name_ko: string | null;
  category: LabCategory;
  unit_default: string | null;
  created_at: string;
  updated_at: string;
}

export interface ObservationRow {
  id: string;
  test_id: string;
  observed_at: string;
  value_numeric: number | null;
  value_text: string | null;
  unit: string | null;
  ref_low: number | null;
  ref_high: number | null;
  flag: ObservationFlag;
  raw_row: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ObservationWithTest extends ObservationRow {
  tests: Pick<TestRow, "id" | "name_en" | "name_ko" | "category" | "unit_default"> | null;
}

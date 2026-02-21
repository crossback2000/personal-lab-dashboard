import { CATEGORY_LABELS, type LabCategory } from "@/types/database";

export const CATEGORY_ORDER: LabCategory[] = [
  "general_blood",
  "chemistry",
  "coagulation",
  "urinalysis",
  "other"
];

export const PERIOD_OPTIONS = [
  { value: "3m", label: "최근 3개월" },
  { value: "1y", label: "최근 1년" },
  { value: "3y", label: "최근 3년" },
  { value: "all", label: "전체" }
] as const;

export type PeriodOption = (typeof PERIOD_OPTIONS)[number]["value"];

export function categoryLabel(category: LabCategory) {
  return CATEGORY_LABELS[category] ?? CATEGORY_LABELS.other;
}

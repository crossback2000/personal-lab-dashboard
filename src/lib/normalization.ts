import type { LabCategory, ObservationRow } from "@/types/database";

export interface NormalizedPoint {
  observedAt: string;
  value: number;
}

export interface NormalizedSeries {
  testId: string;
  label: string;
  labelSub: string | null;
  category: LabCategory;
  latestObservedAt: string;
  latestValue: number;
  points: NormalizedPoint[];
}

export function normalizeObservationValue(
  observation: Pick<ObservationRow, "value_numeric" | "ref_low" | "ref_high">
) {
  const { value_numeric: value, ref_low: low, ref_high: high } = observation;

  if (value === null || low === null || high === null) {
    return null;
  }

  const span = high - low;
  if (!Number.isFinite(span) || span <= 0) {
    return null;
  }

  const midpoint = low + span / 2;
  const halfRange = span / 2;
  if (!Number.isFinite(midpoint) || !Number.isFinite(halfRange) || halfRange <= 0) {
    return null;
  }

  const normalized = (value - midpoint) / halfRange;
  if (!Number.isFinite(normalized)) {
    return null;
  }

  return normalized;
}

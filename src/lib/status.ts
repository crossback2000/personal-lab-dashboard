import type { ObservationRow } from "@/types/database";

export function resolveObservationFlag(
  observation: Pick<ObservationRow, "flag" | "value_numeric" | "ref_low" | "ref_high"> | null
) {
  if (!observation) {
    return null;
  }

  if (observation.flag === "H" || observation.flag === "L") {
    return observation.flag;
  }

  if (
    observation.value_numeric !== null &&
    observation.ref_low !== null &&
    observation.value_numeric < observation.ref_low
  ) {
    return "L";
  }

  if (
    observation.value_numeric !== null &&
    observation.ref_high !== null &&
    observation.value_numeric > observation.ref_high
  ) {
    return "H";
  }

  return null;
}

export function observationStatus(observation: ObservationRow | null) {
  if (!observation) {
    return { label: "데이터 없음", tone: "default" as const };
  }

  const flag = resolveObservationFlag(observation);
  if (flag === "H") {
    return { label: "이상(높음)", tone: "warning" as const };
  }
  if (flag === "L") {
    return { label: "이상(낮음)", tone: "warning" as const };
  }

  return { label: "정상", tone: "success" as const };
}

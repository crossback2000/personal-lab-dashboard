"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  deleteObservation,
  deleteTests,
  getObservationByTestAndDate,
  getObservationsLite,
  getTestById,
  updateTestDetail,
  updateObservationByTestAndDate,
  upsertObservation
} from "@/lib/data/repository";
import { assertRestoreWritable, isRestoreWriteLockedError } from "@/lib/restore-lock";
import { parseNullableNumber } from "@/lib/utils";

type ActionState = {
  ok: boolean;
  message: string;
};

function revalidateDashboardPaths(testId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/import");
  revalidatePath("/dashboard/table");
  if (testId) {
    revalidatePath(`/dashboard/tests/${testId}`);
  }
}

function parseValueInput(raw: FormDataEntryValue | null) {
  const value = String(raw || "").trim();
  const valueNumeric = parseNullableNumber(value);
  return {
    valueNumeric,
    valueText: valueNumeric === null && value ? value : null
  };
}

function isIsoDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function saveObservationAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireUser();
    assertRestoreWritable();

    const testId = String(formData.get("test_id") || "").trim();
    const observedAt = String(formData.get("observed_at") || "").trim();
    const originalObservedAt = String(formData.get("original_observed_at") || "").trim();
    const { valueNumeric, valueText } = parseValueInput(formData.get("value"));

    if (!testId) {
      return { ok: false, message: "검사 항목을 찾지 못했습니다." };
    }

    if (!observedAt) {
      return { ok: false, message: "날짜를 입력하세요." };
    }

    if (!isIsoDateOnly(observedAt)) {
      return { ok: false, message: "날짜 형식이 올바르지 않습니다." };
    }

    if (valueNumeric === null && !valueText) {
      return { ok: false, message: "값을 입력하세요." };
    }

    const test = await getTestById(testId);
    if (!test) {
      return { ok: false, message: "검사 항목이 존재하지 않습니다." };
    }

    const baseline = originalObservedAt
      ? await getObservationByTestAndDate(testId, originalObservedAt, { includeRawRow: true })
      : (await getObservationsLite(testId, "all"))[0] ?? null;

    if (!originalObservedAt) {
      const existing = await getObservationByTestAndDate(testId, observedAt, { includeRawRow: false });
      if (existing) {
        return { ok: false, message: "같은 날짜 데이터가 이미 존재합니다." };
      }
    }

    if (originalObservedAt && !baseline) {
      return { ok: false, message: "수정할 기존 데이터를 찾지 못했습니다." };
    }

    if (originalObservedAt && originalObservedAt !== observedAt) {
      const target = await getObservationByTestAndDate(testId, observedAt, { includeRawRow: false });
      if (target) {
        return { ok: false, message: "같은 날짜 데이터가 이미 존재합니다." };
      }
    }

    if (originalObservedAt) {
      const updated = await updateObservationByTestAndDate({
        testId,
        originalObservedAt,
        nextObservedAt: observedAt,
        valueNumeric,
        valueText,
        unit: baseline?.unit ?? test.unit_default ?? null,
        refLow: baseline?.ref_low ?? null,
        refHigh: baseline?.ref_high ?? null,
        flag: null,
        rawRow: baseline?.raw_row ?? null
      });

      if (updated === 0) {
        return { ok: false, message: "수정할 데이터를 저장하지 못했습니다." };
      }
    } else {
      await upsertObservation({
        testId,
        observedAt,
        valueNumeric,
        valueText,
        unit: baseline?.unit ?? test.unit_default ?? null,
        refLow: baseline?.ref_low ?? null,
        refHigh: baseline?.ref_high ?? null,
        flag: null,
        rawRow: null
      });
    }

    revalidateDashboardPaths(testId);

    return {
      ok: true,
      message: originalObservedAt ? "상세 데이터가 수정되었습니다." : "상세 데이터가 추가되었습니다."
    };
  } catch (error) {
    if (isRestoreWriteLockedError(error)) {
      return { ok: false, message: "현재 복원 작업 중입니다. 잠시 후 다시 시도해 주세요." };
    }

    return {
      ok: false,
      message: error instanceof Error ? error.message : "상세 데이터 저장 중 오류가 발생했습니다."
    };
  }
}

export async function deleteObservationAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireUser();
    assertRestoreWritable();

    const testId = String(formData.get("test_id") || "").trim();
    const observedAt = String(formData.get("observed_at") || "").trim();

    if (!testId || !observedAt) {
      return { ok: false, message: "삭제할 데이터를 찾지 못했습니다." };
    }

    if (!isIsoDateOnly(observedAt)) {
      return { ok: false, message: "날짜 형식이 올바르지 않습니다." };
    }

    const deleted = await deleteObservation({ testId, observedAt });
    if (deleted === 0) {
      return { ok: false, message: "이미 삭제되었거나 존재하지 않는 데이터입니다." };
    }

    revalidateDashboardPaths(testId);
    return { ok: true, message: `${observedAt} 데이터가 삭제되었습니다.` };
  } catch (error) {
    if (isRestoreWriteLockedError(error)) {
      return { ok: false, message: "현재 복원 작업 중입니다. 잠시 후 다시 시도해 주세요." };
    }

    return {
      ok: false,
      message: error instanceof Error ? error.message : "데이터 삭제 중 오류가 발생했습니다."
    };
  }
}

export async function deleteTestsAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireUser();
    assertRestoreWritable();

    const testIds = formData
      .getAll("test_ids")
      .map((value) => String(value).trim())
      .filter(Boolean);

    if (testIds.length === 0) {
      return { ok: false, message: "삭제할 검사 항목을 선택하세요." };
    }

    const deleted = await deleteTests(testIds);
    revalidateDashboardPaths();

    return { ok: true, message: `${deleted}개 검사 항목을 삭제했습니다.` };
  } catch (error) {
    if (isRestoreWriteLockedError(error)) {
      return { ok: false, message: "현재 복원 작업 중입니다. 잠시 후 다시 시도해 주세요." };
    }

    return {
      ok: false,
      message: error instanceof Error ? error.message : "검사 항목 삭제 중 오류가 발생했습니다."
    };
  }
}

export async function saveTestDetailAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireUser();
    assertRestoreWritable();

    const testId = String(formData.get("test_id") || "").trim();
    const nameKoInput = String(formData.get("name_ko") || "").trim();
    const nameEnInput = String(formData.get("name_en") || "").trim();
    const unitDefault = String(formData.get("unit_default") || "").trim() || null;
    const refLow = parseNullableNumber(String(formData.get("ref_low") || ""));
    const refHigh = parseNullableNumber(String(formData.get("ref_high") || ""));
    const observationIds = formData
      .getAll("observation_ids")
      .map((value) => String(value).trim())
      .filter(Boolean);

    if (!testId) {
      return { ok: false, message: "검사 항목을 찾지 못했습니다." };
    }

    const resolvedNameEn = nameEnInput || nameKoInput;
    if (!resolvedNameEn) {
      return { ok: false, message: "항목명(한글 또는 영문) 중 하나는 입력하세요." };
    }

    if (refLow !== null && refHigh !== null && refLow > refHigh) {
      return { ok: false, message: "정상범위 하한은 상한보다 클 수 없습니다." };
    }

    const seenDates = new Set<string>();
    const observations = observationIds.map((id) => {
      const observedAt = String(formData.get(`observed_at_${id}`) || "").trim();
      const { valueNumeric, valueText } = parseValueInput(formData.get(`value_${id}`));

      if (!isIsoDateOnly(observedAt)) {
        throw new Error("날짜 형식이 올바르지 않습니다.");
      }

      if (valueNumeric === null && !valueText) {
        throw new Error("모든 상세 데이터에 값을 입력하세요.");
      }

      if (seenDates.has(observedAt)) {
        throw new Error("상세 데이터 날짜는 중복될 수 없습니다.");
      }
      seenDates.add(observedAt);

      return {
        id,
        observedAt,
        valueNumeric,
        valueText
      };
    });

    await updateTestDetail({
      testId,
      nameEn: resolvedNameEn,
      nameKo: nameKoInput || null,
      unitDefault,
      refLow,
      refHigh,
      observations
    });

    revalidateDashboardPaths(testId);
    return { ok: true, message: "검사항목 상세가 수정되었습니다." };
  } catch (error) {
    if (isRestoreWriteLockedError(error)) {
      return { ok: false, message: "현재 복원 작업 중입니다. 잠시 후 다시 시도해 주세요." };
    }

    return {
      ok: false,
      message: error instanceof Error ? error.message : "검사항목 수정 중 오류가 발생했습니다."
    };
  }
}

export async function deleteTestDetailAction(formData: FormData) {
  await requireUser();
  assertRestoreWritable();

  const testId = String(formData.get("test_id") || "").trim();
  if (!testId) {
    throw new Error("삭제할 검사 항목을 찾지 못했습니다.");
  }

  await deleteTests([testId]);
  revalidateDashboardPaths(testId);
  redirect("/dashboard");
}

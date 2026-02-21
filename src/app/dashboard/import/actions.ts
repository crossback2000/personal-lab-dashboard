"use server";

import Papa from "papaparse";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  createOrGetTest,
  importParsedObservations,
  upsertObservation
} from "@/lib/data/repository";
import { parseCsvRows, parsePastedLabText } from "@/lib/import/parser";
import { assertRestoreWritable, isRestoreWriteLockedError } from "@/lib/restore-lock";
import { parseNullableNumber } from "@/lib/utils";

type ActionState = {
  ok: boolean;
  message: string;
};

const DEFAULT_IMPORT_MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_IMPORT_MAX_ROWS = 100_000;

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function importMaxBytes() {
  return parsePositiveInt(process.env.IMPORT_MAX_BYTES, DEFAULT_IMPORT_MAX_BYTES);
}

function importMaxRows() {
  return parsePositiveInt(process.env.IMPORT_MAX_ROWS, DEFAULT_IMPORT_MAX_ROWS);
}

function normalizeCategory(input: FormDataEntryValue | null) {
  const value = typeof input === "string" ? input.trim() : "";
  return value || "other";
}

export async function manualObservationAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireUser();
    assertRestoreWritable();
    const observedAt = String(formData.get("observed_at") || "").trim();
    const existingTestId = String(formData.get("test_id") || "").trim();
    const newNameKo = String(formData.get("new_name_ko") || "").trim();
    const newNameEn = String(formData.get("new_name_en") || "").trim();
    const valueNumeric = parseNullableNumber(String(formData.get("value_numeric") || ""));
    const valueText = String(formData.get("value_text") || "").trim() || null;
    const unit = String(formData.get("unit") || "").trim() || null;
    const refLow = parseNullableNumber(String(formData.get("ref_low") || ""));
    const refHigh = parseNullableNumber(String(formData.get("ref_high") || ""));
    const category = normalizeCategory(formData.get("category"));

    if (!observedAt) {
      return { ok: false, message: "날짜(observed_at)는 필수입니다." };
    }

    if (valueNumeric === null && !valueText) {
      return { ok: false, message: "숫자값 또는 텍스트값 중 하나는 입력해야 합니다." };
    }

    let testId = existingTestId;

    if (!testId) {
      const resolvedEn = newNameEn || newNameKo;
      if (!resolvedEn) {
        return {
          ok: false,
          message: "기존 검사 항목을 선택하거나 신규 항목명(한글/영문)을 입력하세요."
        };
      }

      const created = await createOrGetTest({
        testNameEn: resolvedEn,
        testNameKo: newNameKo || null,
        category,
        unitDefault: unit
      });
      testId = created.id;
    }

    await upsertObservation({
      testId,
      observedAt,
      valueNumeric,
      valueText,
      unit,
      refLow,
      refHigh,
      flag: null,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/import");
    revalidatePath("/dashboard/table");

    return { ok: true, message: "수동 입력 1건이 저장되었습니다." };
  } catch (error) {
    if (isRestoreWriteLockedError(error)) {
      return { ok: false, message: "현재 복원 작업 중입니다. 잠시 후 다시 시도해 주세요." };
    }

    return {
      ok: false,
      message: error instanceof Error ? error.message : "수동 입력 저장 중 오류가 발생했습니다."
    };
  }
}

export async function pasteImportAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireUser();
    assertRestoreWritable();
    const text = String(formData.get("raw_text") || "");

    if (!text.trim()) {
      return { ok: false, message: "붙여넣기 텍스트를 입력하세요." };
    }

    const maxBytes = importMaxBytes();
    const textBytes = Buffer.byteLength(text, "utf8");
    if (textBytes > maxBytes) {
      return {
        ok: false,
        message: `입력 텍스트가 너무 큽니다. 최대 ${maxBytes.toLocaleString("en-US")} bytes까지 허용됩니다.`
      };
    }

    const parsed = parsePastedLabText(text);
    if (parsed.length === 0) {
      return {
        ok: false,
        message: "파싱 가능한 데이터가 없습니다. 샘플 형식으로 다시 붙여넣어 주세요."
      };
    }

    const maxRows = importMaxRows();
    if (parsed.length > maxRows) {
      return {
        ok: false,
        message: `한 번에 저장 가능한 행 수를 초과했습니다. 최대 ${maxRows.toLocaleString("en-US")}건까지 허용됩니다.`
      };
    }

    const inserted = await importParsedObservations({
      rows: parsed
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/import");
    revalidatePath("/dashboard/table");

    return {
      ok: true,
      message: `텍스트 import 완료: ${inserted}건 저장` 
    };
  } catch (error) {
    if (isRestoreWriteLockedError(error)) {
      return { ok: false, message: "현재 복원 작업 중입니다. 잠시 후 다시 시도해 주세요." };
    }

    return {
      ok: false,
      message: error instanceof Error ? error.message : "텍스트 import 중 오류가 발생했습니다."
    };
  }
}

export async function csvImportAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireUser();
    assertRestoreWritable();
    const csvText = String(formData.get("csv_text") || "");

    if (!csvText.trim()) {
      return { ok: false, message: "CSV 텍스트를 입력하세요." };
    }

    const maxBytes = importMaxBytes();
    const csvBytes = Buffer.byteLength(csvText, "utf8");
    if (csvBytes > maxBytes) {
      return {
        ok: false,
        message: `입력 CSV가 너무 큽니다. 최대 ${maxBytes.toLocaleString("en-US")} bytes까지 허용됩니다.`
      };
    }

    const parsedCsv = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase()
    });

    if (parsedCsv.errors.length > 0) {
      return { ok: false, message: `CSV 파싱 오류: ${parsedCsv.errors[0]?.message}` };
    }

    const parsedRows = parseCsvRows(parsedCsv.data);
    if (parsedRows.length === 0) {
      return {
        ok: false,
        message: "CSV에서 저장 가능한 행을 찾지 못했습니다. 필수 컬럼(test_name, observed_at, value)을 확인하세요."
      };
    }

    const maxRows = importMaxRows();
    if (parsedRows.length > maxRows) {
      return {
        ok: false,
        message: `한 번에 저장 가능한 행 수를 초과했습니다. 최대 ${maxRows.toLocaleString("en-US")}건까지 허용됩니다.`
      };
    }

    const inserted = await importParsedObservations({
      rows: parsedRows
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/import");
    revalidatePath("/dashboard/table");

    return { ok: true, message: `CSV import 완료: ${inserted}건 저장` };
  } catch (error) {
    if (isRestoreWriteLockedError(error)) {
      return { ok: false, message: "현재 복원 작업 중입니다. 잠시 후 다시 시도해 주세요." };
    }

    return {
      ok: false,
      message: error instanceof Error ? error.message : "CSV import 중 오류가 발생했습니다."
    };
  }
}

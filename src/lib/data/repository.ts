import { formatISO, startOfDay, subMonths, subYears } from "date-fns";
import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db/client";
import type { ParsedObservationInput } from "@/lib/import/parser";
import type { LabCategory, ObservationRow, TestRow } from "@/types/database";
import type { PeriodOption } from "@/lib/constants";

type DbTestRow = Omit<TestRow, "created_at" | "updated_at"> & {
  created_at: string;
  updated_at: string;
};

type DbObservationRow = Omit<ObservationRow, "raw_row" | "created_at" | "updated_at"> & {
  raw_row: string | null;
  created_at: string;
  updated_at: string;
};

function nowIso() {
  return new Date().toISOString();
}

function normalizeCategory(value: string | null | undefined): LabCategory {
  if (!value) {
    return "other";
  }

  const normalized = value.toLowerCase();
  if (normalized.includes("혈액") || normalized.includes("cbc") || normalized.includes("blood")) {
    return "general_blood";
  }
  if (
    normalized.includes("화학") ||
    normalized.includes("chem") ||
    normalized.includes("liver") ||
    normalized.includes("renal")
  ) {
    return "chemistry";
  }
  if (
    normalized.includes("응고") ||
    normalized.includes("coag") ||
    normalized.includes("pt") ||
    normalized.includes("aptt")
  ) {
    return "coagulation";
  }
  if (normalized.includes("요") || normalized.includes("urine")) {
    return "urinalysis";
  }

  if (
    normalized === "general_blood" ||
    normalized === "chemistry" ||
    normalized === "coagulation" ||
    normalized === "urinalysis" ||
    normalized === "other"
  ) {
    return normalized;
  }

  return "other";
}

function resolveIncomingCategory(value: string | null | undefined): LabCategory | null {
  const raw = typeof value === "string" ? value.trim() : value;
  if (!raw) {
    return null;
  }
  return normalizeCategory(raw);
}

function periodToStartDate(period: PeriodOption) {
  const now = new Date();

  if (period === "3m") {
    return formatISO(startOfDay(subMonths(now, 3)), { representation: "date" });
  }
  if (period === "1y") {
    return formatISO(startOfDay(subYears(now, 1)), { representation: "date" });
  }
  if (period === "3y") {
    return formatISO(startOfDay(subYears(now, 3)), { representation: "date" });
  }

  return null;
}

function mapTest(row: DbTestRow): TestRow {
  return {
    ...row,
    name_ko: row.name_ko ?? null,
    unit_default: row.unit_default ?? null
  };
}

function mapObservation(row: DbObservationRow): ObservationRow {
  let rawRow: Record<string, unknown> | null = null;

  if (row.raw_row) {
    try {
      rawRow = JSON.parse(row.raw_row) as Record<string, unknown>;
    } catch {
      rawRow = { raw: row.raw_row };
    }
  }

  return {
    ...row,
    value_numeric: row.value_numeric ?? null,
    value_text: row.value_text ?? null,
    unit: row.unit ?? null,
    ref_low: row.ref_low ?? null,
    ref_high: row.ref_high ?? null,
    flag: row.flag ?? null,
    raw_row: rawRow
  };
}

export async function getTests() {
  const db = getDb();
  const rows = db
    .prepare(
      `
      select id, name_en, name_ko, category, unit_default, created_at, updated_at
      from tests
      order by category asc, name_ko collate nocase asc, name_en collate nocase asc
    `
    )
    .all() as DbTestRow[];

  return rows.map(mapTest);
}

export async function getObservations(testId?: string, period: PeriodOption = "all") {
  const db = getDb();

  const clauses: string[] = [];
  const params: string[] = [];

  if (testId) {
    clauses.push("test_id = ?");
    params.push(testId);
  }

  const startDate = periodToStartDate(period);
  if (startDate) {
    clauses.push("observed_at >= ?");
    params.push(startDate);
  }

  const where = clauses.length > 0 ? `where ${clauses.join(" and ")}` : "";

  const rows = db
    .prepare(
      `
      select
        id,
        test_id,
        observed_at,
        value_numeric,
        value_text,
        unit,
        ref_low,
        ref_high,
        flag,
        raw_row,
        created_at,
        updated_at
      from observations
      ${where}
      order by observed_at desc
    `
    )
    .all(...params) as DbObservationRow[];

  return rows.map(mapObservation);
}

export async function getObservationsWithTests() {
  const db = getDb();

  const rows = db
    .prepare(
      `
      select
        o.id,
        o.test_id,
        o.observed_at,
        o.value_numeric,
        o.value_text,
        o.unit,
        o.ref_low,
        o.ref_high,
        o.flag,
        o.raw_row,
        o.created_at,
        o.updated_at,
        t.name_en as test_name_en,
        t.name_ko as test_name_ko,
        t.category as test_category,
        t.unit_default as test_unit_default
      from observations o
      join tests t on t.id = o.test_id
      order by o.observed_at desc
    `
    )
    .all() as Array<
    DbObservationRow & {
      test_name_en: string;
      test_name_ko: string | null;
      test_category: LabCategory;
      test_unit_default: string | null;
    }
  >;

  return rows.map((row) => ({
    observation: mapObservation(row),
    test: {
      id: row.test_id,
      name_en: row.test_name_en,
      name_ko: row.test_name_ko,
      category: row.test_category,
      unit_default: row.test_unit_default
    }
  }));
}

async function findExistingTestByName(testNameEn: string, testNameKo: string | null) {
  const db = getDb();

  const byEn = db
    .prepare(
      `
      select id, name_en, name_ko, category, unit_default, created_at, updated_at
      from tests
      where name_en = ?
      limit 1
    `
    )
    .get(testNameEn) as DbTestRow | undefined;

  if (byEn) {
    return mapTest(byEn);
  }

  if (!testNameKo) {
    return null;
  }

  const byKo = db
    .prepare(
      `
      select id, name_en, name_ko, category, unit_default, created_at, updated_at
      from tests
      where name_ko = ?
      limit 1
    `
    )
    .get(testNameKo) as DbTestRow | undefined;

  return byKo ? mapTest(byKo) : null;
}

export async function createOrGetTest(params: {
  testNameEn: string;
  testNameKo: string | null;
  category?: string | null;
  unitDefault?: string | null;
}) {
  const { testNameEn, testNameKo, category, unitDefault } = params;
  const incomingCategory = resolveIncomingCategory(category);
  const existing = await findExistingTestByName(testNameEn, testNameKo);
  if (existing) {
    const shouldUpdateCategory =
      incomingCategory !== null && incomingCategory !== existing.category;
    const shouldUpdateUnit = !!unitDefault && unitDefault !== existing.unit_default;

    if (!shouldUpdateCategory && !shouldUpdateUnit) {
      return existing;
    }

    const db = getDb();
    const timestamp = nowIso();
    db.prepare(
      `
      update tests
      set
        category = ?,
        unit_default = ?,
        updated_at = ?
      where id = ?
    `
    ).run(
      shouldUpdateCategory ? incomingCategory : existing.category,
      shouldUpdateUnit ? unitDefault : existing.unit_default,
      timestamp,
      existing.id
    );

    const refreshed = db
      .prepare(
        `
        select id, name_en, name_ko, category, unit_default, created_at, updated_at
        from tests
        where id = ?
      `
      )
      .get(existing.id) as DbTestRow;

    return mapTest(refreshed);
  }

  const db = getDb();
  const id = randomUUID();
  const timestamp = nowIso();

  try {
    db.prepare(
      `
      insert into tests (
        id,
        name_en,
        name_ko,
        category,
        unit_default,
        created_at,
        updated_at
      ) values (?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      id,
      testNameEn,
      testNameKo,
      incomingCategory ?? "other",
      unitDefault ?? null,
      timestamp,
      timestamp
    );
  } catch {
    const duplicate = await findExistingTestByName(testNameEn, testNameKo);
    if (duplicate) {
      return duplicate;
    }
    throw new Error("검사 항목 저장 중 오류가 발생했습니다.");
  }

  const created = db
    .prepare(
      `
      select id, name_en, name_ko, category, unit_default, created_at, updated_at
      from tests
      where id = ?
    `
    )
    .get(id) as DbTestRow;

  return mapTest(created);
}

function deriveFlag(params: {
  valueNumeric: number | null;
  refLow: number | null;
  refHigh: number | null;
  inputFlag: "H" | "L" | null;
}): "H" | "L" | null {
  const { valueNumeric, refLow, refHigh, inputFlag } = params;

  if (valueNumeric !== null) {
    if (refLow !== null && valueNumeric < refLow) {
      return "L";
    }
    if (refHigh !== null && valueNumeric > refHigh) {
      return "H";
    }
    if (refLow !== null || refHigh !== null) {
      return null;
    }
  }

  return inputFlag;
}

export async function upsertObservation(params: {
  testId: string;
  observedAt: string;
  valueNumeric: number | null;
  valueText: string | null;
  unit: string | null;
  refLow: number | null;
  refHigh: number | null;
  flag: "H" | "L" | null;
  rawRow?: Record<string, unknown> | null;
}) {
  const db = getDb();
  const id = randomUUID();
  const timestamp = nowIso();
  const derivedFlag = deriveFlag({
    valueNumeric: params.valueNumeric,
    refLow: params.refLow,
    refHigh: params.refHigh,
    inputFlag: params.flag
  });

  db.prepare(
    `
    insert into observations (
      id,
      test_id,
      observed_at,
      value_numeric,
      value_text,
      unit,
      ref_low,
      ref_high,
      flag,
      raw_row,
      created_at,
      updated_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    on conflict (test_id, observed_at)
    do update set
      value_numeric = excluded.value_numeric,
      value_text = excluded.value_text,
      unit = excluded.unit,
      ref_low = excluded.ref_low,
      ref_high = excluded.ref_high,
      flag = excluded.flag,
      raw_row = excluded.raw_row,
      updated_at = excluded.updated_at
  `
  ).run(
    id,
    params.testId,
    params.observedAt,
    params.valueNumeric,
    params.valueText,
    params.unit,
    params.refLow,
    params.refHigh,
    derivedFlag,
    params.rawRow ? JSON.stringify(params.rawRow) : null,
    timestamp,
    timestamp
  );

  const row = db
    .prepare(
      `
      select
        id,
        test_id,
        observed_at,
        value_numeric,
        value_text,
        unit,
        ref_low,
        ref_high,
        flag,
        raw_row,
        created_at,
        updated_at
      from observations
      where test_id = ? and observed_at = ?
      limit 1
    `
    )
    .get(params.testId, params.observedAt) as DbObservationRow;

  return mapObservation(row);
}

export async function importParsedObservations(params: {
  rows: ParsedObservationInput[];
  category?: string | null;
}) {
  const cache = new Map<string, TestRow>();
  let inserted = 0;

  for (const row of params.rows) {
    const cacheKey = `${row.testNameEn}::${row.testNameKo ?? ""}`;
    let test = cache.get(cacheKey);

    if (!test) {
      test = await createOrGetTest({
        testNameEn: row.testNameEn,
        testNameKo: row.testNameKo,
        category: row.categoryHint ?? params.category,
        unitDefault: row.unit
      });
      cache.set(cacheKey, test);
    }

    await upsertObservation({
      testId: test.id,
      observedAt: row.observedAt,
      valueNumeric: row.valueNumeric,
      valueText: row.valueText,
      unit: row.unit ?? test.unit_default,
      refLow: row.refLow,
      refHigh: row.refHigh,
      flag: row.flag,
      rawRow: { line: row.rawRow }
    });

    inserted += 1;
  }

  return inserted;
}

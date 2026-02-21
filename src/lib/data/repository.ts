import { formatISO, startOfDay, subMonths, subYears } from "date-fns";
import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db/client";
import type { PeriodOption } from "@/lib/constants";
import type { ParsedObservationInput } from "@/lib/import/parser";
import {
  normalizeObservationValue,
  type NormalizedSeries
} from "@/lib/normalization";
import type { LabCategory, ObservationRow, TestRow } from "@/types/database";

type DbTestRow = Omit<TestRow, "category" | "created_at" | "updated_at"> & {
  category: string;
  created_at: string;
  updated_at: string;
};

type DbObservationRow = Omit<ObservationRow, "raw_row" | "created_at" | "updated_at"> & {
  raw_row: string | null;
  created_at: string;
  updated_at: string;
};

export interface DashboardCardData {
  test: TestRow;
  latest: ObservationRow | null;
  sparklineValues: number[];
}

type NormalizedSeriesQueryRow = {
  test_id: string;
  observed_at: string;
  value_numeric: number;
  ref_low: number;
  ref_high: number;
  name_en: string;
  name_ko: string | null;
  category: string;
};

type LatestObservationJoinedRow = {
  test_id: string;
  observation_id: string | null;
  observed_at: string | null;
  value_numeric: number | null;
  value_text: string | null;
  unit: string | null;
  ref_low: number | null;
  ref_high: number | null;
  flag: "H" | "L" | null;
  created_at: string | null;
  updated_at: string | null;
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
    category: normalizeCategory(row.category),
    name_ko: row.name_ko ?? null,
    unit_default: row.unit_default ?? null
  };
}

function mapObservation(
  row: DbObservationRow,
  options?: {
    includeRawRow?: boolean;
  }
): ObservationRow {
  const includeRawRow = options?.includeRawRow ?? true;
  let rawRow: Record<string, unknown> | null = null;

  if (includeRawRow && row.raw_row) {
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

function buildObservationFilter(params: {
  testId?: string;
  period?: PeriodOption;
  tableAlias?: string;
}) {
  const clauses: string[] = [];
  const values: string[] = [];
  const tablePrefix = params.tableAlias ? `${params.tableAlias}.` : "";

  if (params.testId) {
    clauses.push(`${tablePrefix}test_id = ?`);
    values.push(params.testId);
  }

  const startDate = periodToStartDate(params.period ?? "all");
  if (startDate) {
    clauses.push(`${tablePrefix}observed_at >= ?`);
    values.push(startDate);
  }

  return {
    where: clauses.length > 0 ? `where ${clauses.join(" and ")}` : "",
    values
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

export async function getObservations(
  testId?: string,
  period: PeriodOption = "all",
  options?: {
    includeRawRow?: boolean;
  }
) {
  const db = getDb();
  const includeRawRow = options?.includeRawRow ?? true;
  const { where, values } = buildObservationFilter({ testId, period });

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
        ${includeRawRow ? "raw_row" : "null as raw_row"},
        created_at,
        updated_at
      from observations
      ${where}
      order by observed_at desc
    `
    )
    .all(...values) as DbObservationRow[];

  return rows.map((row) => mapObservation(row, { includeRawRow }));
}

export async function getObservationsLite(testId?: string, period: PeriodOption = "all") {
  return getObservations(testId, period, { includeRawRow: false });
}

export async function getObservationsWithTests(options?: { includeRawRow?: boolean }) {
  const db = getDb();
  const includeRawRow = options?.includeRawRow ?? true;

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
        ${includeRawRow ? "o.raw_row" : "null as raw_row"},
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
    observation: mapObservation(row, { includeRawRow }),
    test: {
      id: row.test_id,
      name_en: row.test_name_en,
      name_ko: row.test_name_ko,
      category: normalizeCategory(row.test_category),
      unit_default: row.test_unit_default
    }
  }));
}

export async function getDashboardCards(options?: { sparklinePoints?: number }) {
  const db = getDb();
  const sparklinePoints = Math.max(2, Math.min(20, options?.sparklinePoints ?? 10));
  const tests = await getTests();

  const latestRows = db
    .prepare(
      `
      with latest as (
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
          created_at,
          updated_at,
          row_number() over (
            partition by test_id
            order by observed_at desc
          ) as row_num
        from observations
      )
      select
        t.id as test_id,
        l.id as observation_id,
        l.observed_at,
        l.value_numeric,
        l.value_text,
        l.unit,
        l.ref_low,
        l.ref_high,
        l.flag,
        l.created_at,
        l.updated_at
      from tests t
      left join latest l on l.test_id = t.id and l.row_num = 1
    `
    )
    .all() as LatestObservationJoinedRow[];

  const latestMap = new Map<string, ObservationRow>();
  for (const row of latestRows) {
    if (!row.observation_id || !row.observed_at || !row.created_at || !row.updated_at) {
      continue;
    }

    latestMap.set(
      row.test_id,
      mapObservation(
        {
          id: row.observation_id,
          test_id: row.test_id,
          observed_at: row.observed_at,
          value_numeric: row.value_numeric,
          value_text: row.value_text,
          unit: row.unit,
          ref_low: row.ref_low,
          ref_high: row.ref_high,
          flag: row.flag,
          raw_row: null,
          created_at: row.created_at,
          updated_at: row.updated_at
        },
        { includeRawRow: false }
      )
    );
  }

  const sparklineRows = db
    .prepare(
      `
      select test_id, value_numeric
      from (
        select
          test_id,
          value_numeric,
          observed_at,
          row_number() over (
            partition by test_id
            order by observed_at desc
          ) as row_num
        from observations
        where value_numeric is not null
      ) ranked
      where row_num <= ?
      order by test_id asc, observed_at asc
    `
    )
    .all(sparklinePoints) as Array<{ test_id: string; value_numeric: number }>;

  const sparklineMap = new Map<string, number[]>();
  for (const row of sparklineRows) {
    const values = sparklineMap.get(row.test_id) ?? [];
    values.push(row.value_numeric);
    sparklineMap.set(row.test_id, values);
  }

  return tests.map((test) => ({
    test,
    latest: latestMap.get(test.id) ?? null,
    sparklineValues: sparklineMap.get(test.id) ?? []
  } satisfies DashboardCardData));
}

export async function getNormalizedSeries(options?: {
  period?: PeriodOption;
  maxPointsPerTest?: number;
}) {
  const db = getDb();
  const period = options?.period ?? "all";
  const maxPointsPerTest = Math.max(5, Math.min(200, options?.maxPointsPerTest ?? 40));
  const { where, values } = buildObservationFilter({ period, tableAlias: "o" });

  const filterClauses = [where.replace(/^where\s+/i, "").trim()]
    .filter(Boolean)
    .concat([
      "o.value_numeric is not null",
      "o.ref_low is not null",
      "o.ref_high is not null",
      "o.ref_high > o.ref_low"
    ]);

  const rows = db
    .prepare(
      `
      select
        ranked.test_id,
        ranked.observed_at,
        ranked.value_numeric,
        ranked.ref_low,
        ranked.ref_high,
        ranked.name_en,
        ranked.name_ko,
        ranked.category
      from (
        select
          o.test_id,
          o.observed_at,
          o.value_numeric,
          o.ref_low,
          o.ref_high,
          t.name_en,
          t.name_ko,
          t.category,
          row_number() over (
            partition by o.test_id
            order by o.observed_at desc
          ) as row_num
        from observations o
        join tests t on t.id = o.test_id
        where ${filterClauses.join(" and ")}
      ) ranked
      where ranked.row_num <= ?
      order by ranked.test_id asc, ranked.observed_at desc
    `
    )
    .all(...values, maxPointsPerTest) as NormalizedSeriesQueryRow[];

  const grouped = new Map<
    string,
    {
      testId: string;
      label: string;
      labelSub: string | null;
      category: LabCategory;
      pointsDesc: Array<{ observedAt: string; value: number }>;
    }
  >();

  for (const row of rows) {
    const normalizedValue = normalizeObservationValue({
      value_numeric: row.value_numeric,
      ref_low: row.ref_low,
      ref_high: row.ref_high
    });

    if (normalizedValue === null) {
      continue;
    }

    const entry =
      grouped.get(row.test_id) ??
      {
        testId: row.test_id,
        label: row.name_ko || row.name_en,
        labelSub: row.name_ko && row.name_en ? row.name_en : null,
        category: normalizeCategory(row.category),
        pointsDesc: []
      };

    entry.pointsDesc.push({
      observedAt: row.observed_at,
      value: normalizedValue
    });

    grouped.set(row.test_id, entry);
  }

  const series: NormalizedSeries[] = [];

  for (const entry of grouped.values()) {
    const latest = entry.pointsDesc[0];
    if (!latest) {
      continue;
    }

    series.push({
      testId: entry.testId,
      label: entry.label,
      labelSub: entry.labelSub,
      category: entry.category,
      latestObservedAt: latest.observedAt,
      latestValue: latest.value,
      points: [...entry.pointsDesc].reverse()
    });
  }

  return series.sort(
    (a, b) =>
      new Date(b.latestObservedAt).getTime() -
      new Date(a.latestObservedAt).getTime()
  );
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

function prepareObservationUpsertStatement() {
  const db = getDb();
  return db.prepare(
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
  );
}

function runObservationUpsert(
  statement: ReturnType<typeof prepareObservationUpsertStatement>,
  params: {
    testId: string;
    observedAt: string;
    valueNumeric: number | null;
    valueText: string | null;
    unit: string | null;
    refLow: number | null;
    refHigh: number | null;
    flag: "H" | "L" | null;
    rawRow?: Record<string, unknown> | null;
  }
) {
  const id = randomUUID();
  const timestamp = nowIso();
  const derivedFlag = deriveFlag({
    valueNumeric: params.valueNumeric,
    refLow: params.refLow,
    refHigh: params.refHigh,
    inputFlag: params.flag
  });

  statement.run(
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
  const upsertStatement = prepareObservationUpsertStatement();
  runObservationUpsert(upsertStatement, params);

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
  const db = getDb();
  const upsertStatement = prepareObservationUpsertStatement();
  const cache = new Map<string, TestRow>();
  let inserted = 0;

  db.exec("begin immediate");

  try {
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

      runObservationUpsert(upsertStatement, {
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

    db.exec("commit");
    return inserted;
  } catch (error) {
    try {
      db.exec("rollback");
    } catch {
      // noop
    }
    throw error;
  }
}

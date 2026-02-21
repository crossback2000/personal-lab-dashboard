import { parseNullableNumber } from "@/lib/utils";
import type { LabCategory } from "@/types/database";

export interface ParsedObservationInput {
  testNameRaw: string;
  testNameKo: string | null;
  testNameEn: string;
  categoryHint: LabCategory | null;
  observedAt: string;
  valueNumeric: number | null;
  valueText: string | null;
  unit: string | null;
  refLow: number | null;
  refHigh: number | null;
  flag: "H" | "L" | null;
  rawRow: string;
}

const DATE_TOKEN = /^\d{4}[./-]\d{1,2}[./-]\d{1,2}$/;
const HEADER_HINT = /(검사|항목|item|test|unit|참고|ref)/i;
const RANGE_PATTERN = /(-?\d+(?:\.\d+)?)\s*[~-]\s*(-?\d+(?:\.\d+)?)/;
const UNIT_PATTERN = /^[%a-zA-Zµμ\u3380-\u33ff][a-zA-Z0-9/._%-µμ\u3380-\u33ff]*$/;
const BLOCK_IGNORE_PATTERN =
  /(검사결과|검사일\s*:|검사명|한글명|정상범위|요검사|일반혈액|일반화학|응고)/i;

function categoryFromText(raw: string): LabCategory | null {
  const line = raw.toLowerCase();

  if (line.includes("일반혈액") || line.includes("cbc") || line.includes("complete blood")) {
    return "general_blood";
  }
  if (
    line.includes("일반화학") ||
    line.includes("chemistry") ||
    line.includes("간기능") ||
    line.includes("신장기능")
  ) {
    return "chemistry";
  }
  if (line.includes("응고") || line.includes("coag")) {
    return "coagulation";
  }
  if (line.includes("요검사") || line.includes("urinalysis") || line.includes("urine")) {
    return "urinalysis";
  }

  return null;
}

function detectCategoryFromLines(lines: string[]): LabCategory | null {
  for (const line of lines) {
    const matched = categoryFromText(line);
    if (matched) {
      return matched;
    }
  }
  return null;
}

function normalizeDate(raw: string): string | null {
  const token = raw.trim();
  if (!DATE_TOKEN.test(token)) {
    return null;
  }

  const [year, month, day] = token.split(/[./-]/).map((value) => Number(value));
  if (!year || !month || !day) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseRange(input: string) {
  const match = input.match(RANGE_PATTERN);
  if (!match) {
    return { refLow: null, refHigh: null };
  }

  return {
    refLow: parseNullableNumber(match[1]),
    refHigh: parseNullableNumber(match[2])
  };
}

function normalizeFlagValue(value: string): string {
  return value
    .replace(/[▲↑]/g, "H")
    .replace(/[▼↓]/g, "L")
    .trim();
}

function parseValueToken(rawToken: string): {
  valueNumeric: number | null;
  valueText: string | null;
  flag: "H" | "L" | null;
} {
  const token = normalizeFlagValue(rawToken);
  if (!token || token === "-" || token === "--") {
    return { valueNumeric: null, valueText: null, flag: null };
  }

  let flag: "H" | "L" | null = null;
  let valuePart = token;

  if (/H$/i.test(valuePart)) {
    flag = "H";
    valuePart = valuePart.replace(/H$/i, "").trim();
  } else if (/L$/i.test(valuePart)) {
    flag = "L";
    valuePart = valuePart.replace(/L$/i, "").trim();
  }

  const numeric = parseNullableNumber(valuePart);
  if (numeric !== null) {
    return { valueNumeric: numeric, valueText: null, flag };
  }

  return {
    valueNumeric: null,
    valueText: valuePart,
    flag
  };
}

function splitLocalizedName(rawName: string) {
  const compact = rawName.replace(/\s+/g, " ").trim();
  const chunks = compact.split(/[()\[\]\/]+/).map((chunk) => chunk.trim()).filter(Boolean);

  const koParts = chunks.filter((chunk) => /[가-힣]/.test(chunk));
  const enParts = chunks.filter((chunk) => /[A-Za-z]/.test(chunk));

  const testNameKo = koParts.length > 0 ? koParts.join(" ") : null;
  const testNameEn =
    enParts.length > 0
      ? enParts.join(" ")
      : compact || "Unknown Test";

  return {
    testNameRaw: compact,
    testNameKo,
    testNameEn
  };
}

function splitColumns(line: string) {
  if (line.includes("\t")) {
    return line.split("\t").map((token) => token.trim());
  }
  if (line.includes("|")) {
    return line.split("|").map((token) => token.trim());
  }
  return line.split(/\s{2,}/).map((token) => token.trim());
}

function parseTableStyle(
  lines: string[],
  detectedCategory: LabCategory | null
): ParsedObservationInput[] {
  const rows = lines.map((line) => splitColumns(line));

  const headerIndex = rows.findIndex((row) => {
    const hasHeaderKeyword = row.some((cell) => HEADER_HINT.test(cell));
    const hasDate = row.some((cell) => normalizeDate(cell) !== null);
    return hasHeaderKeyword && hasDate;
  });

  if (headerIndex === -1) {
    return [];
  }

  const header = rows[headerIndex];
  const dateColumns = header
    .map((cell, index) => ({ index, date: normalizeDate(cell) }))
    .filter((entry): entry is { index: number; date: string } => entry.date !== null);

  if (dateColumns.length === 0) {
    return [];
  }

  const unitCol = header.findIndex((cell) => /unit/i.test(cell));
  const refCol = header.findIndex((cell) => /(참고|ref|range)/i.test(cell));

  const parsed: ParsedObservationInput[] = [];

  for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const firstCell = row[0]?.trim();

    if (!firstCell || HEADER_HINT.test(firstCell)) {
      continue;
    }

    const names = splitLocalizedName(firstCell);
    const unit = unitCol >= 0 ? row[unitCol] || null : null;
    const range = refCol >= 0 ? parseRange(row[refCol] || "") : { refLow: null, refHigh: null };

    for (const { index, date } of dateColumns) {
      const rawValue = row[index];
      if (!rawValue) {
        continue;
      }

      const parsedValue = parseValueToken(rawValue);
      if (parsedValue.valueNumeric === null && parsedValue.valueText === null) {
        continue;
      }

      parsed.push({
        ...names,
        categoryHint: detectedCategory,
        observedAt: date,
        valueNumeric: parsedValue.valueNumeric,
        valueText: parsedValue.valueText,
        unit,
        refLow: range.refLow,
        refHigh: range.refHigh,
        flag: parsedValue.flag,
        rawRow: lines[rowIndex]
      });
    }
  }

  return parsed;
}

function inferUnit(metaTokens: string[]) {
  const candidate = metaTokens.find(
    (token) =>
      UNIT_PATTERN.test(token) &&
      (token.includes("/") || token.includes("%") || token.includes("^"))
  );
  return candidate ?? null;
}

function parseInlineStyle(
  lines: string[],
  detectedCategory: LabCategory | null
): ParsedObservationInput[] {
  const parsed: ParsedObservationInput[] = [];

  for (const line of lines) {
    if (!line.trim() || HEADER_HINT.test(line.trim())) {
      continue;
    }

    const tokens = line.split(/\s+/).map((token) => token.trim()).filter(Boolean);
    const dateIndices = tokens
      .map((token, index) => ({ index, date: normalizeDate(token) }))
      .filter((item): item is { index: number; date: string } => item.date !== null);

    if (dateIndices.length === 0) {
      continue;
    }

    const firstDateIndex = dateIndices[0]?.index ?? 0;
    const metaTokens = tokens.slice(0, firstDateIndex);
    const metaText = metaTokens.join(" ");
    const unit = inferUnit(metaTokens);
    const range = parseRange(metaText);
    const baseName = metaText.replace(RANGE_PATTERN, "").replace(unit ?? "", "").trim();
    const names = splitLocalizedName(baseName || metaTokens[0] || "Unknown Test");

    for (let i = 0; i < dateIndices.length; i += 1) {
      const { index: dateIndex, date } = dateIndices[i];
      const valueToken = tokens[dateIndex + 1];
      if (!valueToken) {
        continue;
      }

      const parsedValue = parseValueToken(valueToken);
      if (parsedValue.valueNumeric === null && parsedValue.valueText === null) {
        continue;
      }

      parsed.push({
        ...names,
        categoryHint: detectedCategory,
        observedAt: date,
        valueNumeric: parsedValue.valueNumeric,
        valueText: parsedValue.valueText,
        unit,
        refLow: range.refLow,
        refHigh: range.refHigh,
        flag: parsedValue.flag,
        rawRow: line
      });
    }
  }

  return parsed;
}

function parseTestHeaderLine(
  line: string
):
  | ({
      unit: string | null;
    } & ReturnType<typeof splitLocalizedName>)
  | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  if (normalizeDate(trimmed) !== null) {
    return null;
  }

  if (BLOCK_IGNORE_PATTERN.test(trimmed)) {
    return null;
  }

  if (trimmed.includes("\t")) {
    const columns = trimmed.split("\t").map((cell) => cell.trim()).filter(Boolean);
    if (columns.length === 0) {
      return null;
    }

    if (columns.some((cell) => normalizeDate(cell) !== null)) {
      return null;
    }

    if (columns.every((cell) => HEADER_HINT.test(cell))) {
      return null;
    }

    const first = columns[0] ?? "";
    const second = columns[1] ?? "";
    const third = columns[2] ?? "";

    let testNameEn = first;
    let testNameKo: string | null = /[가-힣]/.test(second) ? second : null;

    if (!/[A-Za-z]/.test(testNameEn) && /[A-Za-z]/.test(second)) {
      testNameEn = second;
      testNameKo = /[가-힣]/.test(first) ? first : testNameKo;
    }

    const names = splitLocalizedName(
      `${testNameEn}${testNameKo ? ` (${testNameKo})` : ""}`
    );

    return {
      ...names,
      testNameEn: testNameEn.trim() || names.testNameEn,
      testNameKo,
      unit: UNIT_PATTERN.test(third) ? third : null
    };
  }

  if (!/[A-Za-z가-힣]/.test(trimmed)) {
    return null;
  }

  const names = splitLocalizedName(trimmed);
  if (!names.testNameKo && !/[A-Za-z]/.test(names.testNameEn)) {
    return null;
  }

  const unit = trimmed
    .split(/\s+/)
    .find(
      (token) =>
        UNIT_PATTERN.test(token) &&
        (token.includes("/") || token.includes("%") || token.includes("^"))
    );

  return {
    ...names,
    unit: unit ?? null
  };
}

function normalizeUnitToken(raw: string): string {
  return raw.replace(/[()]/g, "").trim();
}

function isLikelyUnitLine(raw: string): boolean {
  const token = normalizeUnitToken(raw);
  if (!token) {
    return false;
  }

  if (normalizeDate(token) !== null) {
    return false;
  }

  const range = parseRange(token);
  if (range.refLow !== null || range.refHigh !== null) {
    return false;
  }

  const parsedValue = parseValueToken(token);
  if (parsedValue.valueNumeric !== null && parsedValue.valueText === null) {
    return false;
  }

  return /[a-zA-Zµμ/%^\u3380-\u33ff]/.test(token);
}

function parseGroupedBlockStyle(
  lines: string[],
  fallbackCategory: LabCategory | null
): ParsedObservationInput[] {
  const parsed: ParsedObservationInput[] = [];
  let index = 0;
  let currentCategory: LabCategory | null = fallbackCategory;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    const header = parseTestHeaderLine(line);
    const categoryFromLine = categoryFromText(line);
    if (categoryFromLine) {
      currentCategory = categoryFromLine;
      if (!header) {
        index += 1;
        continue;
      }
    }
    if (!header) {
      index += 1;
      continue;
    }

    let cursor = index + 1;
    const dates: string[] = [];

    while (cursor < lines.length) {
      const normalizedDate = normalizeDate(lines[cursor] ?? "");
      if (!normalizedDate) {
        break;
      }
      dates.push(normalizedDate);
      cursor += 1;
    }

    if (dates.length === 0) {
      index += 1;
      continue;
    }

    const valueLines = lines.slice(cursor, cursor + dates.length);
    if (valueLines.length < dates.length) {
      index += 1;
      continue;
    }

    const values = valueLines.map((line) => parseValueToken(line));
    if (values.some((value) => value.valueNumeric === null && value.valueText === null)) {
      index += 1;
      continue;
    }

    cursor += dates.length;

    let units: string[] = [];
    const candidateUnitLines = lines.slice(cursor, cursor + dates.length);
    if (
      candidateUnitLines.length === dates.length &&
      candidateUnitLines.every((unitLine) => isLikelyUnitLine(unitLine))
    ) {
      units = candidateUnitLines.map((unitLine) => normalizeUnitToken(unitLine));
      cursor += dates.length;
    }

    const ranges: Array<{ refLow: number | null; refHigh: number | null }> = [];
    while (cursor < lines.length && ranges.length < dates.length) {
      const rawRange = lines[cursor] ?? "";
      const range = parseRange(rawRange);
      if (range.refLow === null && range.refHigh === null) {
        break;
      }
      ranges.push(range);
      cursor += 1;
    }

    for (let offset = 0; offset < dates.length; offset += 1) {
      const value = values[offset];
      if (!value) {
        continue;
      }

      const range = ranges[offset] ?? ranges[0] ?? { refLow: null, refHigh: null };

      parsed.push({
        testNameRaw: header.testNameRaw,
        testNameKo: header.testNameKo,
        testNameEn: header.testNameEn,
        categoryHint: currentCategory,
        observedAt: dates[offset] ?? "",
        valueNumeric: value.valueNumeric,
        valueText: value.valueText,
        unit: units[offset] ?? units[0] ?? header.unit,
        refLow: range.refLow,
        refHigh: range.refHigh,
        flag: value.flag,
        rawRow: lines.slice(index, cursor).join(" | ")
      });
    }

    index = cursor;
  }

  return parsed;
}

export function parsePastedLabText(raw: string): ParsedObservationInput[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.replace(/\u00A0/g, " ").trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const detectedCategory = detectCategoryFromLines(lines);

  const tableParsed = parseTableStyle(lines, detectedCategory);
  if (tableParsed.length > 0) {
    return tableParsed;
  }

  const groupedParsed = parseGroupedBlockStyle(lines, detectedCategory);
  if (groupedParsed.length > 0) {
    return groupedParsed;
  }

  return parseInlineStyle(lines, detectedCategory);
}

export function parseCsvRows(rows: Record<string, string>[]): ParsedObservationInput[] {
  return rows
    .map((row) => {
      const mergedName = [row.test_name_ko, row.test_name_en].filter(Boolean).join(" ").trim();
      const testRaw = row.test_name || mergedName || row.test || row.name || "";
      const observedAt = normalizeDate(row.observed_at || row.date || "");
      if (!testRaw || !observedAt) {
        return null;
      }

      const names = splitLocalizedName(testRaw);
      const parsedValue = parseValueToken(row.value ?? row.value_numeric ?? row.value_text ?? "");
      const valueNumeric =
        parsedValue.valueNumeric ?? parseNullableNumber(row.value_numeric ?? "");
      const valueText = (parsedValue.valueText ?? row.value_text?.trim()) || null;
      const parsedRange = parseRange(row.ref_range ?? "");
      const flagInput = (row.flag ?? "").trim().toUpperCase();
      const csvFlag = flagInput === "H" || flagInput === "L" ? flagInput : null;

      return {
        ...names,
        categoryHint: categoryFromText(
          row.category ?? row.panel ?? row.section ?? row.group ?? ""
        ),
        observedAt,
        valueNumeric,
        valueText,
        unit: row.unit || null,
        refLow: parseNullableNumber(row.ref_low ?? "") ?? parsedRange.refLow,
        refHigh: parseNullableNumber(row.ref_high ?? "") ?? parsedRange.refHigh,
        flag: csvFlag ?? parsedValue.flag ?? null,
        rawRow: JSON.stringify(row)
      };
    })
    .filter((item): item is ParsedObservationInput => item !== null);
}

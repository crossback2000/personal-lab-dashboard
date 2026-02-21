import path from "node:path";
import Database from "better-sqlite3";

const dbPath = process.env.DB_PATH || path.join(process.cwd(), "data", "lab-dashboard.sqlite");
const db = new Database(dbPath);

const now = new Date().toISOString();

const tests = [
  {
    id: "test-hemo",
    name_en: "Hemoglobin",
    name_ko: "혈색소",
    category: "general_blood",
    unit_default: "g/dL"
  },
  {
    id: "test-platelet",
    name_en: "Platelet",
    name_ko: "혈소판",
    category: "general_blood",
    unit_default: "10^3/uL"
  },
  {
    id: "test-urine-sg",
    name_en: "Urine SG",
    name_ko: "요비중",
    category: "urinalysis",
    unit_default: null
  }
];

for (const test of tests) {
  db.prepare(
    `
    insert into tests (id, name_en, name_ko, category, unit_default, created_at, updated_at)
    values (@id, @name_en, @name_ko, @category, @unit_default, @created_at, @updated_at)
    on conflict(name_en)
    do update set
      name_ko = excluded.name_ko,
      category = excluded.category,
      unit_default = excluded.unit_default,
      updated_at = excluded.updated_at
  `
  ).run({
    ...test,
    created_at: now,
    updated_at: now
  });
}

const obs = [
  ["test-hemo", "2025-10-01", 13.2, null, "g/dL", 13, 17, null],
  ["test-hemo", "2025-11-01", 12.8, null, "g/dL", 13, 17, "L"],
  ["test-hemo", "2025-12-01", 13.5, null, "g/dL", 13, 17, null],
  ["test-platelet", "2025-10-01", 220, null, "10^3/uL", 150, 400, null],
  ["test-platelet", "2025-12-01", 198, null, "10^3/uL", 150, 400, null],
  ["test-urine-sg", "2025-10-01", 1.02, null, null, 1.005, 1.03, null],
  ["test-urine-sg", "2025-11-01", 1.032, null, null, 1.005, 1.03, "H"]
];

for (const [test_id, observed_at, value_numeric, value_text, unit, ref_low, ref_high, flag] of obs) {
  db.prepare(
    `
    insert into observations (
      id, test_id, observed_at, value_numeric, value_text, unit,
      ref_low, ref_high, flag, raw_row, created_at, updated_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, '{"seed":true}', ?, ?)
    on conflict(test_id, observed_at)
    do update set
      value_numeric = excluded.value_numeric,
      value_text = excluded.value_text,
      unit = excluded.unit,
      ref_low = excluded.ref_low,
      ref_high = excluded.ref_high,
      flag = excluded.flag,
      updated_at = excluded.updated_at
  `
  ).run(`seed-${test_id}-${observed_at}`, test_id, observed_at, value_numeric, value_text, unit, ref_low, ref_high, flag, now, now);
}

db.close();

console.log(`Seeded demo data into ${dbPath}`);

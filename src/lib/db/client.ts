import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { SQLITE_SCHEMA } from "@/lib/db/schema";

let instance: Database.Database | null = null;

interface TableInfoRow {
  name: string;
}

export function getDbPath() {
  return process.env.DB_PATH || path.join(process.cwd(), "data", "lab-dashboard.sqlite");
}

function ensureDbDirectory(dbPath: string) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

function hasLegacyObservationSourceColumn(db: Database.Database) {
  const columns = db.prepare("pragma table_info(observations)").all() as TableInfoRow[];
  return columns.some((column) => column.name === "source");
}

function migrateObservationsDropSourceColumn(db: Database.Database) {
  if (!hasLegacyObservationSourceColumn(db)) {
    return;
  }

  const foreignKeysEnabled = Number(db.pragma("foreign_keys", { simple: true })) === 1;
  if (foreignKeysEnabled) {
    db.pragma("foreign_keys = OFF");
  }

  try {
    db.exec(
      `
      begin;
      create table observations_migrated (
        id text primary key,
        test_id text not null references tests(id) on delete cascade,
        observed_at text not null,
        value_numeric real,
        value_text text,
        unit text,
        ref_low real,
        ref_high real,
        flag text,
        raw_row text,
        created_at text not null,
        updated_at text not null,
        check (value_numeric is not null or value_text is not null),
        check (flag in ('H', 'L') or flag is null),
        unique (test_id, observed_at)
      );
      insert into observations_migrated (
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
      )
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
      from observations;
      drop table observations;
      alter table observations_migrated rename to observations;
      create index if not exists idx_observations_test_date on observations(test_id, observed_at desc);
      commit;
    `
    );
  } catch (error) {
    try {
      db.exec("rollback");
    } catch {
      // noop
    }
    throw error;
  } finally {
    if (foreignKeysEnabled) {
      db.pragma("foreign_keys = ON");
    }
  }
}

export function getDb() {
  if (instance) {
    return instance;
  }

  const dbPath = getDbPath();
  ensureDbDirectory(dbPath);

  const db = new Database(dbPath);
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");
  db.exec(SQLITE_SCHEMA);
  migrateObservationsDropSourceColumn(db);

  instance = db;
  return db;
}

export function closeDb() {
  if (!instance) {
    return;
  }

  instance.close();
  instance = null;
}

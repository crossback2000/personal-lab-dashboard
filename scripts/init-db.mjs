import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const dbPath = process.env.DB_PATH || path.join(process.cwd(), "data", "lab-dashboard.sqlite");
const schemaPath = path.join(process.cwd(), "db", "schema.sql");

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const schemaSql = fs.readFileSync(schemaPath, "utf-8");
const db = new Database(dbPath);

db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");
db.exec(schemaSql);

db.close();

console.log(`Initialized database at ${dbPath}`);

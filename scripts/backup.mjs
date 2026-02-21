import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const dbPath = process.env.DB_PATH || path.join(process.cwd(), "data", "lab-dashboard.sqlite");
const backupDir = process.env.BACKUP_DIR || path.join(path.dirname(dbPath), "backups");
const keepDays = Number(process.env.BACKUP_KEEP_DAYS || "30");
const maxFiles = Number(process.env.BACKUP_MAX_FILES || "30");

if (!fs.existsSync(dbPath)) {
  throw new Error(`DB file does not exist: ${dbPath}`);
}

fs.mkdirSync(backupDir, { recursive: true });

const fileName = `lab-dashboard-${new Date().toISOString().replace(/[:.]/g, "-")}.sqlite`;
const backupPath = path.join(backupDir, fileName);

const db = new Database(dbPath, { fileMustExist: true });
try {
  await db.backup(backupPath);
} catch (error) {
  if (fs.existsSync(backupPath)) {
    fs.unlinkSync(backupPath);
  }
  throw error;
} finally {
  db.close();
}

const files = fs
  .readdirSync(backupDir)
  .filter((file) => file.endsWith(".sqlite"))
  .map((file) => {
    const fullPath = path.join(backupDir, file);
    const stat = fs.statSync(fullPath);
    return {
      file,
      fullPath,
      modifiedAt: stat.mtime.getTime()
    };
  })
  .sort((a, b) => b.modifiedAt - a.modifiedAt);

const deleteTargets = new Set();

if (Number.isFinite(keepDays) && keepDays > 0) {
  const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000;
  for (const backup of files) {
    if (backup.modifiedAt < cutoff) {
      deleteTargets.add(backup.fullPath);
    }
  }
}

if (Number.isFinite(maxFiles) && maxFiles > 0) {
  const keptByAge = files.filter((backup) => !deleteTargets.has(backup.fullPath));
  for (const backup of keptByAge.slice(maxFiles)) {
    deleteTargets.add(backup.fullPath);
  }
}

for (const fullPath of deleteTargets) {
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}

console.log(`Backup created: ${backupPath}`);

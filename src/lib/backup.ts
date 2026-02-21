import fs from "node:fs/promises";
import path from "node:path";
import { getDb, getDbPath } from "@/lib/db/client";

type BackupMeta = {
  file: string;
  size: number;
  modifiedAt: string;
};

type BackupMetaInternal = BackupMeta & {
  fullPath: string;
  modifiedAtMs: number;
};

const TEMP_SNAPSHOT_TTL_MS = 24 * 60 * 60 * 1000;

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function normalizePrefix(input?: string) {
  const raw = (input || "lab-dashboard").trim();
  const safe = raw.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/-+/g, "-");
  return safe || "lab-dashboard";
}

export function getBackupDir() {
  return process.env.BACKUP_DIR || path.join(path.dirname(getDbPath()), "backups");
}

async function safeUnlink(filePath: string) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

async function removeWalArtifacts(basePath: string) {
  await safeUnlink(`${basePath}-wal`);
  await safeUnlink(`${basePath}-shm`);
}

async function cleanupBackupAuxiliaryFiles(backupDir: string) {
  const now = Date.now();
  let files: string[] = [];
  try {
    files = await fs.readdir(backupDir);
  } catch {
    return;
  }

  const tasks: Promise<void>[] = [];
  for (const file of files) {
    if (file.endsWith(".sqlite-wal") || file.endsWith(".sqlite-shm")) {
      tasks.push(safeUnlink(path.join(backupDir, file)));
      continue;
    }
  }

  const tempDir = path.join(backupDir, ".tmp");
  let tempFiles: string[] = [];
  try {
    tempFiles = await fs.readdir(tempDir);
  } catch {
    tempFiles = [];
  }

  for (const file of tempFiles) {
    if (!file.endsWith(".sqlite") && !file.endsWith(".sqlite-wal") && !file.endsWith(".sqlite-shm")) {
      continue;
    }
    const fullPath = path.join(tempDir, file);
    try {
      const stat = await fs.stat(fullPath);
      if (now - stat.mtimeMs >= TEMP_SNAPSHOT_TTL_MS) {
        tasks.push(safeUnlink(fullPath));
      }
    } catch {
      // ignore stat race
    }
  }

  await Promise.all(tasks);
}

async function createConsistentSnapshot(destinationPath: string) {
  await safeUnlink(destinationPath);
  const db = getDb();
  try {
    await db.backup(destinationPath);
    await removeWalArtifacts(destinationPath);
  } catch (error) {
    await removeWalArtifacts(destinationPath);
    await safeUnlink(destinationPath);
    throw error;
  }
}

function parseKeepDays() {
  const raw = process.env.BACKUP_KEEP_DAYS;
  if (!raw) {
    return 30;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 30;
}

function parseMaxFiles() {
  const raw = process.env.BACKUP_MAX_FILES;
  if (!raw) {
    return 30;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 30;
}

export function getBackupRetentionPolicy() {
  return {
    keepDays: parseKeepDays(),
    maxFiles: parseMaxFiles()
  };
}

function toBackupMeta(item: BackupMetaInternal): BackupMeta {
  return {
    file: item.file,
    size: item.size,
    modifiedAt: item.modifiedAt
  };
}

async function readBackupMetas(): Promise<BackupMetaInternal[]> {
  const backupDir = getBackupDir();
  await fs.mkdir(backupDir, { recursive: true });

  const files = await fs.readdir(backupDir);
  const stats = await Promise.all(
    files
      .filter((file) => file.endsWith(".sqlite"))
      .map(async (file) => {
        const fullPath = path.join(backupDir, file);
        const stat = await fs.stat(fullPath);
        return {
          file,
          fullPath,
          size: stat.size,
          modifiedAt: stat.mtime.toISOString(),
          modifiedAtMs: stat.mtimeMs
        };
      })
  );

  return stats.sort((a, b) => b.modifiedAtMs - a.modifiedAtMs);
}

export async function listBackups() {
  const backups = await readBackupMetas();
  return backups.map(toBackupMeta);
}

export async function pruneBackups() {
  const { keepDays, maxFiles } = getBackupRetentionPolicy();
  const backups = await readBackupMetas();

  const thresholdMs = keepDays > 0
    ? Date.now() - keepDays * 24 * 60 * 60 * 1000
    : Number.NEGATIVE_INFINITY;

  let kept = keepDays > 0
    ? backups.filter((backup) => backup.modifiedAtMs >= thresholdMs)
    : backups;

  if (maxFiles > 0 && kept.length > maxFiles) {
    kept = kept.slice(0, maxFiles);
  }

  const keptPaths = new Set(kept.map((backup) => backup.fullPath));
  const deletedPaths = backups
    .filter((backup) => !keptPaths.has(backup.fullPath))
    .map((backup) => backup.fullPath);

  await Promise.all(
    deletedPaths.map(async (fullPath) => {
      try {
        await fs.unlink(fullPath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          throw error;
        }
      }
    })
  );

  await cleanupBackupAuxiliaryFiles(getBackupDir());

  return {
    deletedCount: deletedPaths.length,
    backups: kept.map(toBackupMeta)
  };
}

export async function createBackupSnapshot(prefix?: string) {
  const backupDir = getBackupDir();
  await fs.mkdir(backupDir, { recursive: true });

  const fileName = `${normalizePrefix(prefix)}-${timestamp()}.sqlite`;
  const destination = path.join(backupDir, fileName);

  await createConsistentSnapshot(destination);
  await pruneBackups();

  return {
    fileName,
    fullPath: destination
  };
}

export async function createTemporaryBackupSnapshot(prefix?: string) {
  const backupDir = getBackupDir();
  const tempDir = path.join(backupDir, ".tmp");
  await fs.mkdir(tempDir, { recursive: true });

  const fileName = `${normalizePrefix(prefix || "db-download")}-${timestamp()}.sqlite`;
  const destination = path.join(tempDir, fileName);
  await createConsistentSnapshot(destination);

  return {
    fileName,
    fullPath: destination,
    cleanup: async () => {
      await removeWalArtifacts(destination);
      await safeUnlink(destination);
    }
  };
}

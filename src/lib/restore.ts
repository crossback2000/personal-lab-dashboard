import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";
import { createBackupSnapshot, getBackupDir } from "@/lib/backup";
import { closeDb, getDb, getDbPath } from "@/lib/db/client";
import {
  finishRestoreRun,
  isRestoreWriteLocked,
  setRestoreWriteLock,
  startRestoreRun
} from "@/lib/restore-lock";

const SQLITE_MAGIC = "SQLite format 3\u0000";
const PREPARED_TOKEN_TTL_MS = 30 * 60 * 1000;
const DEFAULT_RESTORE_MAX_PREPARED = 5;
const DEFAULT_RESTORE_UPLOAD_MAX_BYTES = 100 * 1024 * 1024;
const VALIDATE_OPEN_RETRY_COUNT = 3;
const VALIDATE_OPEN_RETRY_BASE_MS = 40;

const REQUIRED_TEST_COLUMNS = [
  "id",
  "name_en",
  "name_ko",
  "category",
  "unit_default",
  "created_at",
  "updated_at"
];

const REQUIRED_OBSERVATION_COLUMNS = [
  "id",
  "test_id",
  "observed_at",
  "value_numeric",
  "value_text",
  "unit",
  "ref_low",
  "ref_high",
  "flag",
  "raw_row",
  "created_at",
  "updated_at"
];

interface PreparedRestore {
  token: string;
  tempPath: string;
  fileName: string;
  uploadedAt: string;
}

export interface RestoreValidation {
  ok: boolean;
  fileName: string;
  fileSize: number;
  integrityCheck: string;
  requiredTables: {
    tests: boolean;
    observations: boolean;
  };
  missingColumns: {
    tests: string[];
    observations: string[];
  };
  message: string;
}

export class RestoreValidationError extends Error {
  code = "RESTORE_VALIDATION_FAILED";
  validation: RestoreValidation;

  constructor(validation: RestoreValidation) {
    super(validation.message);
    this.name = "RestoreValidationError";
    this.validation = validation;
  }
}

export class RestoreTokenError extends Error {
  code = "RESTORE_TOKEN_INVALID";

  constructor(message = "유효하지 않거나 만료된 복원 토큰입니다.") {
    super(message);
    this.name = "RestoreTokenError";
  }
}

export class RestoreCommitError extends Error {
  code = "RESTORE_COMMIT_FAILED";
  rolledBack: boolean;
  snapshotFile: string | null;

  constructor(message: string, params?: { rolledBack?: boolean; snapshotFile?: string | null }) {
    super(message);
    this.name = "RestoreCommitError";
    this.rolledBack = params?.rolledBack ?? false;
    this.snapshotFile = params?.snapshotFile ?? null;
  }
}

export class RestoreLimitError extends Error {
  code = "RESTORE_LIMIT_REACHED";
  status: number;

  constructor(message: string, status = 429) {
    super(message);
    this.name = "RestoreLimitError";
    this.status = status;
  }
}

const preparedRestores = new Map<string, PreparedRestore>();

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

function restoreMaxPreparedCount() {
  return parsePositiveInt(process.env.RESTORE_MAX_PREPARED, DEFAULT_RESTORE_MAX_PREPARED);
}

function restoreUploadMaxBytes() {
  return parsePositiveInt(process.env.RESTORE_UPLOAD_MAX_BYTES, DEFAULT_RESTORE_UPLOAD_MAX_BYTES);
}

function getRestoreTempDir() {
  return path.join(getBackupDir(), ".restore-tmp");
}

async function ensureRestoreTempDir() {
  const tempDir = getRestoreTempDir();
  await fs.mkdir(tempDir, { recursive: true });
  return tempDir;
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

function normalizeDbError(error: unknown) {
  if (!(error instanceof Error)) {
    return "";
  }

  return error.message.replace(/\s+/g, " ").trim().slice(0, 160);
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function removeWalArtifacts(dbPath: string) {
  await safeUnlink(`${dbPath}-wal`);
  await safeUnlink(`${dbPath}-shm`);
}

async function readSqliteHeader(filePath: string) {
  const handle = await fs.open(filePath, "r");

  try {
    const buffer = Buffer.alloc(16);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    if (bytesRead < buffer.length) {
      return "";
    }
    return buffer.toString("utf8");
  } finally {
    await handle.close();
  }
}

async function replaceFileAtomically(sourcePath: string, targetPath: string) {
  try {
    await fs.rename(sourcePath, targetPath);
    return;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EXDEV") {
      throw error;
    }
  }

  await fs.copyFile(sourcePath, targetPath);
  await safeUnlink(sourcePath);
}

function getMissingColumns(required: string[], actual: string[]) {
  const set = new Set(actual);
  return required.filter((column) => !set.has(column));
}

function getTableColumns(db: Database.Database, tableName: string) {
  const rows = db
    .prepare(`pragma table_info(${tableName})`)
    .all() as Array<{ name: string }>;
  return rows.map((row) => row.name);
}

function toValidationMessage(validation: {
  headerOk: boolean;
  integrityCheck: string;
  hasTestsTable: boolean;
  hasObservationsTable: boolean;
  missingTestColumns: string[];
  missingObservationColumns: string[];
}) {
  if (!validation.headerOk) {
    return "SQLite DB 파일 형식이 아닙니다.";
  }

  if (validation.integrityCheck !== "ok") {
    return `무결성 검사 실패: ${validation.integrityCheck}`;
  }

  if (!validation.hasTestsTable || !validation.hasObservationsTable) {
    return "필수 테이블(tests/observations)이 없습니다.";
  }

  if (
    validation.missingTestColumns.length > 0 ||
    validation.missingObservationColumns.length > 0
  ) {
    return "필수 컬럼이 누락되어 있습니다.";
  }

  return "복원 가능한 DB 파일입니다.";
}

export async function validateRestoreFile(params: {
  filePath: string;
  fileName: string;
}): Promise<RestoreValidation> {
  const { filePath, fileName } = params;

  let fileSize = 0;
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      return {
        ok: false,
        fileName,
        fileSize: 0,
        integrityCheck: "not-a-file",
        requiredTables: { tests: false, observations: false },
        missingColumns: {
          tests: [...REQUIRED_TEST_COLUMNS],
          observations: [...REQUIRED_OBSERVATION_COLUMNS]
        },
        message: "업로드 파일을 찾을 수 없습니다."
      };
    }
    fileSize = stat.size;
  } catch {
    return {
      ok: false,
      fileName,
      fileSize: 0,
      integrityCheck: "stat-failed",
      requiredTables: { tests: false, observations: false },
      missingColumns: {
        tests: [...REQUIRED_TEST_COLUMNS],
        observations: [...REQUIRED_OBSERVATION_COLUMNS]
      },
      message: "업로드 파일을 확인할 수 없습니다."
    };
  }

  const header = await readSqliteHeader(filePath);
  const headerOk = header === SQLITE_MAGIC;

  let db: Database.Database | null = null;
  let integrityCheck = "open-failed";
  let hasTestsTable = false;
  let hasObservationsTable = false;
  let missingTestColumns = [...REQUIRED_TEST_COLUMNS];
  let missingObservationColumns = [...REQUIRED_OBSERVATION_COLUMNS];

  for (let attempt = 0; attempt < VALIDATE_OPEN_RETRY_COUNT; attempt += 1) {
    try {
      db = new Database(filePath, { readonly: true, fileMustExist: true });

      const integrityRow = db.prepare("PRAGMA integrity_check").get() as
        | Record<string, unknown>
        | undefined;
      const firstValue = integrityRow ? Object.values(integrityRow)[0] : undefined;
      integrityCheck = typeof firstValue === "string" ? firstValue : "integrity-check-failed";

      const tableRows = db
        .prepare(
          `
          select name
          from sqlite_master
          where type = 'table' and name in ('tests', 'observations')
        `
        )
        .all() as Array<{ name: string }>;

      const tableNames = new Set(tableRows.map((row) => row.name));
      hasTestsTable = tableNames.has("tests");
      hasObservationsTable = tableNames.has("observations");

      if (hasTestsTable) {
        const columns = getTableColumns(db, "tests");
        missingTestColumns = getMissingColumns(REQUIRED_TEST_COLUMNS, columns);
      }

      if (hasObservationsTable) {
        const columns = getTableColumns(db, "observations");
        missingObservationColumns = getMissingColumns(REQUIRED_OBSERVATION_COLUMNS, columns);
      }

      break;
    } catch (error) {
      const reason = normalizeDbError(error);
      integrityCheck = reason ? `open-failed:${reason}` : "open-failed";
      if (attempt < VALIDATE_OPEN_RETRY_COUNT - 1) {
        await sleep(VALIDATE_OPEN_RETRY_BASE_MS * (attempt + 1));
      }
    } finally {
      db?.close();
      db = null;
    }
  }

  const message = toValidationMessage({
    headerOk,
    integrityCheck,
    hasTestsTable,
    hasObservationsTable,
    missingTestColumns,
    missingObservationColumns
  });

  const ok =
    headerOk &&
    integrityCheck === "ok" &&
    hasTestsTable &&
    hasObservationsTable &&
    missingTestColumns.length === 0 &&
    missingObservationColumns.length === 0;

  return {
    ok,
    fileName,
    fileSize,
    integrityCheck,
    requiredTables: {
      tests: hasTestsTable,
      observations: hasObservationsTable
    },
    missingColumns: {
      tests: missingTestColumns,
      observations: missingObservationColumns
    },
    message
  };
}

export async function cleanupExpiredPreparedRestores() {
  const now = Date.now();
  const deletions: Promise<void>[] = [];

  for (const [token, entry] of preparedRestores.entries()) {
    const uploadedAt = new Date(entry.uploadedAt).getTime();
    if (Number.isNaN(uploadedAt) || now - uploadedAt > PREPARED_TOKEN_TTL_MS) {
      preparedRestores.delete(token);
      deletions.push(safeUnlink(entry.tempPath));
    }
  }

  await Promise.all(deletions);
}

export async function prepareRestoreUpload(params: {
  fileName: string;
  bytes: Buffer;
}) {
  await cleanupExpiredPreparedRestores();

  const maxPrepared = restoreMaxPreparedCount();
  if (preparedRestores.size >= maxPrepared) {
    throw new RestoreLimitError(
      `동시에 준비 가능한 복원 파일 수를 초과했습니다. 잠시 후 다시 시도해 주세요. (max=${maxPrepared})`
    );
  }

  const maxBytes = restoreUploadMaxBytes();
  if (params.bytes.byteLength > maxBytes) {
    throw new RestoreLimitError(
      `업로드 파일이 너무 큽니다. 최대 ${maxBytes.toLocaleString("en-US")} bytes까지 허용됩니다.`,
      413
    );
  }

  const tempDir = await ensureRestoreTempDir();

  const token = randomUUID();
  const safeFileName = path.basename(params.fileName || "restore.sqlite");
  const tempPath = path.join(tempDir, `${token}-${safeFileName}`);

  await fs.writeFile(tempPath, params.bytes);

  const validation = await validateRestoreFile({
    filePath: tempPath,
    fileName: safeFileName
  });

  if (!validation.ok) {
    await safeUnlink(tempPath);
    throw new RestoreValidationError(validation);
  }

  preparedRestores.set(token, {
    token,
    tempPath,
    fileName: safeFileName,
    uploadedAt: new Date().toISOString()
  });

  return {
    restoreToken: token,
    validation
  };
}

function consumePreparedRestore(token: string) {
  const prepared = preparedRestores.get(token);
  if (!prepared) {
    throw new RestoreTokenError();
  }
  preparedRestores.delete(token);
  return prepared;
}

async function rollbackFromSnapshot(snapshotPath: string, dbPath: string) {
  closeDb();
  await fs.copyFile(snapshotPath, dbPath);
  await removeWalArtifacts(dbPath);
  closeDb();
  getDb();
}

export async function commitPreparedRestore(restoreToken: string) {
  if (isRestoreWriteLocked()) {
    throw new RestoreCommitError("이미 복원 작업이 진행 중입니다.");
  }

  await cleanupExpiredPreparedRestores();
  const prepared = consumePreparedRestore(restoreToken);
  const startedAt = startRestoreRun();

  const dbPath = getDbPath();
  let stagedSwapPath: string | null = null;
  let snapshot:
    | {
        fileName: string;
        fullPath: string;
      }
    | null = null;

  setRestoreWriteLock(true);
  try {
    const validation = await validateRestoreFile({
      filePath: prepared.tempPath,
      fileName: prepared.fileName
    });
    if (!validation.ok) {
      throw new RestoreValidationError(validation);
    }

    snapshot = await createBackupSnapshot("pre-restore-lab-dashboard");

    closeDb();
    stagedSwapPath = path.join(path.dirname(dbPath), `.restore-${randomUUID()}.sqlite`);
    await fs.copyFile(prepared.tempPath, stagedSwapPath);
    await removeWalArtifacts(stagedSwapPath);

    const stagedValidation = await validateRestoreFile({
      filePath: stagedSwapPath,
      fileName: path.basename(stagedSwapPath)
    });
    if (!stagedValidation.ok) {
      throw new Error(`스테이징 DB 검증 실패: ${stagedValidation.message}`);
    }

    await replaceFileAtomically(stagedSwapPath, dbPath);
    stagedSwapPath = null;
    await removeWalArtifacts(dbPath);

    const restoredValidation = await validateRestoreFile({
      filePath: dbPath,
      fileName: path.basename(dbPath)
    });
    if (!restoredValidation.ok) {
      throw new Error(`복원된 DB 검증 실패: ${restoredValidation.message}`);
    }

    closeDb();
    getDb();

    const restoredAt = new Date().toISOString();
    finishRestoreRun({
      status: "success",
      startedAt,
      message: `복원 완료: ${prepared.fileName}`,
      snapshotFile: snapshot.fileName,
      rolledBack: false
    });

    return {
      restoredAt,
      snapshotFile: snapshot.fileName
    };
  } catch (error) {
    let rolledBack = false;
    if (snapshot) {
      try {
        await rollbackFromSnapshot(snapshot.fullPath, dbPath);
        rolledBack = true;
      } catch {
        rolledBack = false;
      }
    }

    if (error instanceof RestoreValidationError) {
      finishRestoreRun({
        status: "failed",
        startedAt,
        message: error.message,
        snapshotFile: snapshot?.fileName ?? null,
        rolledBack
      });
      throw error;
    }

    const message = error instanceof Error ? error.message : "DB 복원 중 오류가 발생했습니다.";
    finishRestoreRun({
      status: "failed",
      startedAt,
      message,
      snapshotFile: snapshot?.fileName ?? null,
      rolledBack
    });
    throw new RestoreCommitError(message, {
      rolledBack,
      snapshotFile: snapshot?.fileName ?? null
    });
  } finally {
    setRestoreWriteLock(false);
    if (stagedSwapPath) {
      await safeUnlink(stagedSwapPath);
    }
    await safeUnlink(prepared.tempPath);
  }
}

export function getPreparedRestoreCount() {
  return preparedRestores.size;
}

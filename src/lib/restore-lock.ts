export const RESTORE_WRITE_LOCKED_CODE = "RESTORE_WRITE_LOCKED";

export class RestoreWriteLockedError extends Error {
  code = RESTORE_WRITE_LOCKED_CODE;

  constructor(message = "현재 복원 작업 중입니다. 잠시 후 다시 시도해 주세요.") {
    super(message);
    this.name = "RestoreWriteLockedError";
  }
}

export interface RestoreRunRecord {
  status: "success" | "failed";
  startedAt: string;
  finishedAt: string;
  message: string;
  snapshotFile: string | null;
  rolledBack: boolean;
}

let writeLocked = false;
let running = false;
let currentStartedAt: string | null = null;
let lastRun: RestoreRunRecord | null = null;

export function isRestoreWriteLocked() {
  return writeLocked;
}

export function setRestoreWriteLock(locked: boolean) {
  writeLocked = locked;
}

export function assertRestoreWritable() {
  if (!writeLocked) {
    return;
  }

  throw new RestoreWriteLockedError();
}

export function isRestoreWriteLockedError(error: unknown) {
  if (error instanceof RestoreWriteLockedError) {
    return true;
  }

  if (!error || typeof error !== "object") {
    return false;
  }

  const code = (error as { code?: string }).code;
  return code === RESTORE_WRITE_LOCKED_CODE;
}

export function startRestoreRun() {
  running = true;
  const startedAt = new Date().toISOString();
  currentStartedAt = startedAt;
  return startedAt;
}

export function finishRestoreRun(params: {
  status: "success" | "failed";
  startedAt?: string;
  message: string;
  snapshotFile?: string | null;
  rolledBack?: boolean;
}) {
  const finishedAt = new Date().toISOString();
  const startedAt = params.startedAt ?? currentStartedAt ?? finishedAt;

  lastRun = {
    status: params.status,
    startedAt,
    finishedAt,
    message: params.message,
    snapshotFile: params.snapshotFile ?? null,
    rolledBack: params.rolledBack ?? false
  };
  running = false;
  currentStartedAt = null;
}

export function getRestoreStatus() {
  return {
    running,
    lastRun
  };
}

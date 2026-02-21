"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buttonStyles } from "@/components/ui/button";

interface BackupMeta {
  file: string;
  size: number;
  modifiedAt: string;
}

interface RetentionPolicy {
  keepDays: number;
  maxFiles: number;
}

interface RestoreValidation {
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

interface RestoreRunRecord {
  status: "success" | "failed";
  startedAt: string;
  finishedAt: string;
  message: string;
  snapshotFile: string | null;
  rolledBack: boolean;
}

interface RestoreStatusResponse {
  ok?: boolean;
  message?: string;
  running?: boolean;
  lastRun?: RestoreRunRecord | null;
  preparedCount?: number;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ko-KR");
}

function formatRetentionSummary(retention: RetentionPolicy) {
  const keepDaysText =
    retention.keepDays > 0 ? `최근 ${retention.keepDays}일 이내` : "기간 제한 없음";
  const maxFilesText =
    retention.maxFiles > 0 ? `최대 ${retention.maxFiles}개 유지` : "개수 제한 없음";
  return `${keepDaysText}, ${maxFilesText}`;
}

export function BackupControls() {
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [backups, setBackups] = useState<BackupMeta[]>([]);
  const [retention, setRetention] = useState<RetentionPolicy>({
    keepDays: 30,
    maxFiles: 30
  });

  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreToken, setRestoreToken] = useState<string | null>(null);
  const [restoreValidation, setRestoreValidation] = useState<RestoreValidation | null>(null);
  const [restoreStatus, setRestoreStatus] = useState<RestoreStatusResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refreshList = useCallback(async () => {
    const response = await fetch("/api/backup/list", { cache: "no-store" });
    const result = (await response.json()) as {
      backups?: BackupMeta[];
      retention?: RetentionPolicy;
    };
    setBackups(result.backups ?? []);
    if (result.retention) {
      setRetention(result.retention);
    }
  }, []);

  const refreshRestoreStatus = useCallback(async () => {
    const response = await fetch("/api/backup/restore/status", { cache: "no-store" });
    const result = (await response.json()) as RestoreStatusResponse;
    setRestoreStatus(result);
  }, []);

  async function createBackup() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/backup/create", {
        method: "POST"
      });
      const result = (await response.json()) as {
        ok?: boolean;
        backup?: { fileName: string };
        message?: string;
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.message || "백업 생성 실패");
      }

      setMessage(`백업 생성 완료: ${result.backup?.fileName}`);
      await refreshList();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "백업 생성 실패");
    } finally {
      setLoading(false);
    }
  }

  async function uploadRestoreFile() {
    if (!restoreFile) {
      setMessage("복원할 .sqlite 파일을 선택해 주세요.");
      return;
    }

    setRestoreLoading(true);
    setMessage("");
    setRestoreToken(null);
    setRestoreValidation(null);

    try {
      const formData = new FormData();
      formData.append("file", restoreFile);

      const response = await fetch("/api/backup/restore/upload", {
        method: "POST",
        body: formData
      });
      const result = (await response.json()) as {
        ok?: boolean;
        message?: string;
        restoreToken?: string;
        validation?: RestoreValidation;
      };

      if (!response.ok || !result.ok || !result.restoreToken || !result.validation) {
        throw new Error(result.message || "복원 파일 검증에 실패했습니다.");
      }

      setRestoreToken(result.restoreToken);
      setRestoreValidation(result.validation);
      setMessage(`복원 파일 검증 완료: ${result.validation.fileName}`);
      await refreshRestoreStatus();
    } catch (error) {
      setRestoreToken(null);
      setRestoreValidation(null);
      setMessage(error instanceof Error ? error.message : "복원 파일 업로드 중 오류가 발생했습니다.");
    } finally {
      setRestoreLoading(false);
    }
  }

  async function commitRestore() {
    if (!restoreToken) {
      setMessage("먼저 복원 파일 검증을 완료해 주세요.");
      return;
    }

    const shouldProceed = window.confirm(
      "현재 DB를 업로드한 파일로 복원합니다. 복원 전 자동 백업이 생성됩니다. 계속할까요?"
    );
    if (!shouldProceed) {
      return;
    }

    setRestoreLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/backup/restore/commit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ restoreToken })
      });
      const result = (await response.json()) as {
        ok?: boolean;
        message?: string;
        restoredAt?: string;
        snapshotFile?: string | null;
        rolledBack?: boolean;
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.message || "DB 복원에 실패했습니다.");
      }

      setMessage(
        `DB 복원 완료 (${formatDateTime(result.restoredAt)}). 사전 백업: ${result.snapshotFile || "-"}`
      );
      setRestoreToken(null);
      setRestoreValidation(null);
      setRestoreFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await Promise.all([refreshList(), refreshRestoreStatus()]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "DB 복원 중 오류가 발생했습니다.");
      await refreshRestoreStatus();
    } finally {
      setRestoreLoading(false);
    }
  }

  useEffect(() => {
    void refreshList();
    void refreshRestoreStatus();
  }, [refreshList, refreshRestoreStatus]);

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={createBackup}
          disabled={loading || restoreStatus?.running === true}
          className={buttonStyles({ variant: "outline", size: "sm" })}
        >
          {loading ? "백업 중..." : "백업 생성"}
        </button>
        <button
          type="button"
          onClick={() => {
            void refreshList();
            void refreshRestoreStatus();
          }}
          className={buttonStyles({ variant: "ghost", size: "sm" })}
        >
          백업 목록 새로고침
        </button>
        <a href="/api/backup/download" className={buttonStyles({ variant: "default", size: "sm" })}>
          DB 다운로드
        </a>
        <a href="/api/export/json" className={buttonStyles({ variant: "outline", size: "sm" })}>
          JSON Export
        </a>
        <a href="/api/export/csv" className={buttonStyles({ variant: "outline", size: "sm" })}>
          CSV Export
        </a>
      </div>

      {message ? <p className="mt-2 text-sm text-muted-foreground">{message}</p> : null}

      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        <p>보관 정책: {formatRetentionSummary(retention)}</p>
        {backups.length > 0 ? (
          <>
            {backups.slice(0, 10).map((backup) => (
              <p key={backup.file}>
                {backup.file} ({formatBytes(backup.size)}) - {new Date(backup.modifiedAt).toLocaleString("ko-KR")}
              </p>
            ))}
          </>
        ) : (
          <p>생성된 백업 파일이 없습니다.</p>
        )}
      </div>

      <div className="mt-4 space-y-3 border-t pt-4">
        <p className="text-sm font-medium">DB 복원</p>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".sqlite"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              setRestoreFile(file);
              setRestoreToken(null);
              setRestoreValidation(null);
            }}
            className="text-sm"
          />
          <button
            type="button"
            onClick={() => {
              void uploadRestoreFile();
            }}
            disabled={!restoreFile || restoreLoading || restoreStatus?.running === true}
            className={buttonStyles({ variant: "outline", size: "sm" })}
          >
            {restoreLoading ? "검증 중..." : "검증 업로드"}
          </button>
          <button
            type="button"
            onClick={() => {
              void commitRestore();
            }}
            disabled={!restoreToken || restoreLoading || restoreStatus?.running === true}
            className={buttonStyles({ variant: "default", size: "sm" })}
          >
            {restoreLoading ? "복원 준비 중..." : "복원 실행"}
          </button>
        </div>

        {restoreValidation ? (
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>
              파일: {restoreValidation.fileName} ({formatBytes(restoreValidation.fileSize)}) / 무결성:{" "}
              {restoreValidation.integrityCheck}
            </p>
            <p>
              테이블 검사: tests={restoreValidation.requiredTables.tests ? "OK" : "없음"}, observations=
              {restoreValidation.requiredTables.observations ? "OK" : "없음"}
            </p>
            <p>
              누락 컬럼: tests[{restoreValidation.missingColumns.tests.join(", ") || "-"}], observations[
              {restoreValidation.missingColumns.observations.join(", ") || "-"}]
            </p>
          </div>
        ) : null}

        {restoreStatus ? (
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>복원 실행 중: {restoreStatus.running ? "예" : "아니오"}</p>
            <p>대기 중 검증 토큰: {restoreStatus.preparedCount ?? 0}</p>
            {restoreStatus.lastRun ? (
              <>
                <p>
                  최근 결과: {restoreStatus.lastRun.status === "success" ? "성공" : "실패"} / 시작{" "}
                  {formatDateTime(restoreStatus.lastRun.startedAt)} / 종료{" "}
                  {formatDateTime(restoreStatus.lastRun.finishedAt)}
                </p>
                <p>최근 메시지: {restoreStatus.lastRun.message}</p>
                <p>
                  사전 백업: {restoreStatus.lastRun.snapshotFile || "-"} / 롤백:{" "}
                  {restoreStatus.lastRun.rolledBack ? "예" : "아니오"}
                </p>
              </>
            ) : (
              <p>최근 복원 기록이 없습니다.</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

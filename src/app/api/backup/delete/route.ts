import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { getBackupDir } from "@/lib/backup";
import { checkRateLimit, defaultRateLimitPolicies, isSameOriginRequest } from "@/lib/request-security";
import { isRestoreWriteLocked } from "@/lib/restore-lock";

export const dynamic = "force-dynamic";

function sanitizeBackupFileName(raw: unknown) {
  const value = String(raw || "").trim();
  if (!value) {
    return "";
  }
  if (value !== path.basename(value)) {
    return "";
  }
  if (!value.endsWith(".sqlite")) {
    return "";
  }
  return value;
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, message: "Forbidden origin" }, { status: 403 });
  }

  const limitResult = checkRateLimit(request, defaultRateLimitPolicies().backupDelete);
  if (!limitResult.ok) {
    return NextResponse.json(
      { ok: false, message: "Too many requests. Please retry later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(limitResult.retryAfterSec)
        }
      }
    );
  }

  try {
    await requireApiUser();
  } catch {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  if (isRestoreWriteLocked()) {
    return NextResponse.json(
      { ok: false, message: "현재 복원 작업 중입니다. 잠시 후 다시 시도해 주세요." },
      { status: 423 }
    );
  }

  let fileName = "";
  try {
    const body = (await request.json()) as { fileName?: string };
    fileName = sanitizeBackupFileName(body.fileName);
  } catch {
    return NextResponse.json({ ok: false, message: "요청 본문(JSON)을 해석할 수 없습니다." }, { status: 400 });
  }

  if (!fileName) {
    return NextResponse.json({ ok: false, message: "유효한 백업 파일명을 입력해 주세요." }, { status: 400 });
  }

  const backupDir = path.resolve(getBackupDir());
  const fullPath = path.resolve(path.join(backupDir, fileName));
  if (path.dirname(fullPath) !== backupDir) {
    return NextResponse.json({ ok: false, message: "잘못된 백업 파일 경로입니다." }, { status: 400 });
  }

  try {
    await fs.unlink(fullPath);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return NextResponse.json({ ok: false, message: "이미 삭제되었거나 존재하지 않는 파일입니다." }, { status: 404 });
    }
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "백업 삭제에 실패했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    deleted: {
      fileName
    }
  });
}

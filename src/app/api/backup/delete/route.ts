import fs from "node:fs/promises";
import path from "node:path";
import { getBackupDir } from "@/lib/backup";
import { defaultRateLimitPolicies } from "@/lib/request-security";
import { guardApiRequest, jsonNoStore } from "@/lib/http/guard";
import { exceedsSmallJsonBodyLimit, smallJsonBodyLimitBytes } from "@/lib/http/body-size";
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
  const guard = await guardApiRequest(request, {
    auth: "api-user",
    sameOrigin: true,
    rateLimitPolicy: defaultRateLimitPolicies().backupDelete
  });
  if (!guard.ok) {
    return guard.response;
  }

  if (isRestoreWriteLocked()) {
    return jsonNoStore(
      { ok: false, message: "현재 복원 작업 중입니다. 잠시 후 다시 시도해 주세요." },
      { status: 423 }
    );
  }

  if (exceedsSmallJsonBodyLimit(request)) {
    return jsonNoStore(
      {
        ok: false,
        message: `요청 본문이 너무 큽니다. 최대 ${smallJsonBodyLimitBytes().toLocaleString("en-US")} bytes까지 허용됩니다.`
      },
      { status: 413 }
    );
  }

  let fileName = "";
  try {
    const body = (await request.json()) as { fileName?: string };
    fileName = sanitizeBackupFileName(body.fileName);
  } catch {
    return jsonNoStore(
      { ok: false, message: "요청 본문(JSON)을 해석할 수 없습니다." },
      { status: 400 }
    );
  }

  if (!fileName) {
    return jsonNoStore(
      { ok: false, message: "유효한 백업 파일명을 입력해 주세요." },
      { status: 400 }
    );
  }

  const backupDir = path.resolve(getBackupDir());
  const fullPath = path.resolve(path.join(backupDir, fileName));
  if (path.dirname(fullPath) !== backupDir) {
    return jsonNoStore(
      { ok: false, message: "잘못된 백업 파일 경로입니다." },
      { status: 400 }
    );
  }

  try {
    await fs.unlink(fullPath);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return jsonNoStore(
        { ok: false, message: "이미 삭제되었거나 존재하지 않는 파일입니다." },
        { status: 404 }
      );
    }
    console.error("[backup.delete] failed", error);
    return jsonNoStore(
      { ok: false, message: "백업 삭제에 실패했습니다." },
      { status: 500 }
    );
  }

  return jsonNoStore({
    ok: true,
    deleted: {
      fileName
    }
  });
}

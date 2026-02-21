import { NextResponse } from "next/server";
import { createBackupSnapshot } from "@/lib/backup";
import { requireApiUser } from "@/lib/auth";
import { checkRateLimit, defaultRateLimitPolicies, isSameOriginRequest } from "@/lib/request-security";
import { isRestoreWriteLocked } from "@/lib/restore-lock";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, message: "Forbidden origin" }, { status: 403 });
  }

  const limitResult = checkRateLimit(request, defaultRateLimitPolicies().backupCreate);
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

  try {
    const backup = await createBackupSnapshot();
    return NextResponse.json({ ok: true, backup: { fileName: backup.fileName } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "백업 생성 실패" },
      { status: 500 }
    );
  }
}

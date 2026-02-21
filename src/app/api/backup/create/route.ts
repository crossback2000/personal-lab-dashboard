import { createBackupSnapshot } from "@/lib/backup";
import { defaultRateLimitPolicies } from "@/lib/request-security";
import { guardApiRequest, jsonNoStore } from "@/lib/http/guard";
import { isRestoreWriteLocked } from "@/lib/restore-lock";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = await guardApiRequest(request, {
    auth: "api-user",
    sameOrigin: true,
    rateLimitPolicy: defaultRateLimitPolicies().backupCreate
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

  try {
    const backup = await createBackupSnapshot();
    return jsonNoStore({ ok: true, backup: { fileName: backup.fileName } });
  } catch (error) {
    console.error("[backup.create] failed", error);
    return jsonNoStore(
      { ok: false, message: "백업 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

import { defaultRateLimitPolicies } from "@/lib/request-security";
import {
  commitPreparedRestore,
  RestoreCommitError,
  RestoreTokenError,
  RestoreValidationError
} from "@/lib/restore";
import { guardApiRequest, jsonNoStore } from "@/lib/http/guard";
import { exceedsSmallJsonBodyLimit, smallJsonBodyLimitBytes } from "@/lib/http/body-size";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = await guardApiRequest(request, {
    auth: "restore-admin",
    sameOrigin: true,
    rateLimitPolicy: defaultRateLimitPolicies().restoreCommit
  });
  if (!guard.ok) {
    return guard.response;
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

  let restoreToken = "";
  try {
    const body = (await request.json()) as { restoreToken?: string };
    restoreToken = String(body.restoreToken || "").trim();
  } catch {
    return jsonNoStore(
      { ok: false, message: "요청 본문(JSON)을 해석할 수 없습니다." },
      { status: 400 }
    );
  }

  if (!restoreToken) {
    return jsonNoStore(
      { ok: false, message: "restoreToken이 필요합니다." },
      { status: 400 }
    );
  }

  try {
    const result = await commitPreparedRestore(restoreToken);
    return jsonNoStore({ ok: true, ...result });
  } catch (error) {
    if (error instanceof RestoreTokenError) {
      return jsonNoStore({ ok: false, message: error.message }, { status: 400 });
    }

    if (error instanceof RestoreValidationError) {
      return jsonNoStore(
        {
          ok: false,
          message: error.message,
          validation: error.validation
        },
        { status: 400 }
      );
    }

    if (error instanceof RestoreCommitError) {
      return jsonNoStore(
        {
          ok: false,
          message: error.message,
          rolledBack: error.rolledBack,
          snapshotFile: error.snapshotFile
        },
        { status: 500 }
      );
    }

    console.error("[restore.commit] failed", error);
    return jsonNoStore(
      { ok: false, message: "DB 복원 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

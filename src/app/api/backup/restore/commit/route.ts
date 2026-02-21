import { NextResponse } from "next/server";
import { requireRestoreAdmin } from "@/lib/auth";
import { checkRateLimit, defaultRateLimitPolicies, isSameOriginRequest } from "@/lib/request-security";
import {
  commitPreparedRestore,
  RestoreCommitError,
  RestoreTokenError,
  RestoreValidationError
} from "@/lib/restore";

export const dynamic = "force-dynamic";

function authErrorStatus(error: unknown) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return 401;
  }
  return 403;
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, message: "Forbidden origin" }, { status: 403 });
  }

  const limitResult = checkRateLimit(request, defaultRateLimitPolicies().restoreCommit);
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
    await requireRestoreAdmin();
  } catch (error) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: authErrorStatus(error) });
  }

  let restoreToken = "";
  try {
    const body = (await request.json()) as { restoreToken?: string };
    restoreToken = String(body.restoreToken || "").trim();
  } catch {
    return NextResponse.json({ ok: false, message: "요청 본문(JSON)을 해석할 수 없습니다." }, { status: 400 });
  }

  if (!restoreToken) {
    return NextResponse.json({ ok: false, message: "restoreToken이 필요합니다." }, { status: 400 });
  }

  try {
    const result = await commitPreparedRestore(restoreToken);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof RestoreTokenError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 400 });
    }

    if (error instanceof RestoreValidationError) {
      return NextResponse.json(
        {
          ok: false,
          message: error.message,
          validation: error.validation
        },
        { status: 400 }
      );
    }

    if (error instanceof RestoreCommitError) {
      return NextResponse.json(
        {
          ok: false,
          message: error.message,
          rolledBack: error.rolledBack,
          snapshotFile: error.snapshotFile
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "DB 복원 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

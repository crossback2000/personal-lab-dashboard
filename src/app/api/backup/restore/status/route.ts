import { NextResponse } from "next/server";
import { requireRestoreAdmin } from "@/lib/auth";
import { checkRateLimit, defaultRateLimitPolicies } from "@/lib/request-security";
import { cleanupExpiredPreparedRestores, getPreparedRestoreCount } from "@/lib/restore";
import { getRestoreStatus } from "@/lib/restore-lock";

export const dynamic = "force-dynamic";

function authErrorStatus(error: unknown) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return 401;
  }
  return 403;
}

export async function GET(request: Request) {
  const limitResult = checkRateLimit(request, defaultRateLimitPolicies().restoreStatus);
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

  await cleanupExpiredPreparedRestores();

  const status = getRestoreStatus();
  return NextResponse.json({
    ok: true,
    running: status.running,
    lastRun: status.lastRun,
    preparedCount: getPreparedRestoreCount()
  });
}

import { defaultRateLimitPolicies } from "@/lib/request-security";
import { cleanupExpiredPreparedRestores, getPreparedRestoreCount } from "@/lib/restore";
import { getRestoreStatus } from "@/lib/restore-lock";
import { guardApiRequest, jsonNoStore } from "@/lib/http/guard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await guardApiRequest(request, {
    auth: "restore-admin",
    sameOrigin: true,
    rateLimitPolicy: defaultRateLimitPolicies().restoreStatus
  });
  if (!guard.ok) {
    return guard.response;
  }

  await cleanupExpiredPreparedRestores();

  const status = getRestoreStatus();
  return jsonNoStore({
    ok: true,
    running: status.running,
    lastRun: status.lastRun,
    preparedCount: getPreparedRestoreCount()
  });
}

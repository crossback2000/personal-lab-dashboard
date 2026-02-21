import { getBackupRetentionPolicy, listBackups } from "@/lib/backup";
import { defaultRateLimitPolicies } from "@/lib/request-security";
import { guardApiRequest, jsonNoStore } from "@/lib/http/guard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await guardApiRequest(request, {
    auth: "api-user",
    sameOrigin: true,
    rateLimitPolicy: defaultRateLimitPolicies().backupList
  });
  if (!guard.ok) {
    return guard.response;
  }

  const backups = await listBackups();
  const retention = getBackupRetentionPolicy();
  return jsonNoStore({ backups, retention });
}

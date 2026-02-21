import { NextResponse } from "next/server";
import { getBackupRetentionPolicy, pruneBackups } from "@/lib/backup";
import { requireApiUser } from "@/lib/auth";
import { checkRateLimit, defaultRateLimitPolicies } from "@/lib/request-security";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limitResult = checkRateLimit(request, defaultRateLimitPolicies().backupList);
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { backups } = await pruneBackups();
  const retention = getBackupRetentionPolicy();
  return NextResponse.json({ backups, retention });
}

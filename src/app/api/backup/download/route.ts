import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { createTemporaryBackupSnapshot } from "@/lib/backup";
import { getDbPath } from "@/lib/db/client";
import { checkRateLimit, defaultRateLimitPolicies } from "@/lib/request-security";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limitResult = checkRateLimit(request, defaultRateLimitPolicies().backupDownload);
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

  const dbPath = getDbPath();
  const fileName = path
    .basename(dbPath)
    .replace(/[^a-zA-Z0-9._-]/g, "_");

  let snapshot:
    | {
        fileName: string;
        fullPath: string;
        cleanup: () => Promise<void>;
      }
    | null = null;

  try {
    snapshot = await createTemporaryBackupSnapshot("download-lab-dashboard");
    const file = await fs.readFile(snapshot.fullPath);
    return new NextResponse(file, {
      status: 200,
      headers: {
        "Content-Type": "application/x-sqlite3",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
        Pragma: "no-cache"
      }
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "DB 스냅샷을 생성하지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    if (snapshot) {
      await snapshot.cleanup();
    }
  }
}

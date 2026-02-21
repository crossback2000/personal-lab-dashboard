import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { createTemporaryBackupSnapshot } from "@/lib/backup";
import { getDbPath } from "@/lib/db/client";
import { defaultRateLimitPolicies } from "@/lib/request-security";
import { guardApiRequest, jsonNoStore, withNoStoreHeaders } from "@/lib/http/guard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await guardApiRequest(request, {
    auth: "api-user",
    sameOrigin: true,
    rateLimitPolicy: defaultRateLimitPolicies().backupDownload
  });
  if (!guard.ok) {
    return guard.response;
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
      headers: withNoStoreHeaders({
        "Content-Type": "application/x-sqlite3",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      })
    });
  } catch (error) {
    console.error("[backup.download] failed", error);
    return jsonNoStore(
      { error: "DB 스냅샷을 생성하지 못했습니다." },
      { status: 500 }
    );
  } finally {
    if (snapshot) {
      await snapshot.cleanup();
    }
  }
}

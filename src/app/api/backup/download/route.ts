import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
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

  try {
    const file = await fs.readFile(dbPath);
    return new NextResponse(file, {
      status: 200,
      headers: {
        "Content-Type": "application/x-sqlite3",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
        Pragma: "no-cache"
      }
    });
  } catch {
    return NextResponse.json({ error: "DB 파일을 찾을 수 없습니다." }, { status: 404 });
  }
}

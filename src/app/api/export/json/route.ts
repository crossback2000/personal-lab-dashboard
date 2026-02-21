import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { getObservationsWithTests } from "@/lib/data/repository";
import { checkRateLimit, defaultRateLimitPolicies } from "@/lib/request-security";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limitResult = checkRateLimit(request, defaultRateLimitPolicies().exportJson);
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

  const rows = await getObservationsWithTests();
  const payload = JSON.stringify(
    rows.map((entry) => ({
      ...entry.observation,
      tests: entry.test
    })),
    null,
    2
  );

  return new NextResponse(payload, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="lab-observations.json"',
      "Cache-Control": "no-store",
      Pragma: "no-cache"
    }
  });
}

import { getObservationsWithTests } from "@/lib/data/repository";
import { defaultRateLimitPolicies } from "@/lib/request-security";
import { guardApiRequest, withNoStoreHeaders } from "@/lib/http/guard";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await guardApiRequest(request, {
    auth: "api-user",
    sameOrigin: true,
    rateLimitPolicy: defaultRateLimitPolicies().exportJson
  });
  if (!guard.ok) {
    return guard.response;
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
    headers: withNoStoreHeaders({
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="lab-observations.json"',
    })
  });
}

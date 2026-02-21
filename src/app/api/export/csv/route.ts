import Papa from "papaparse";
import { NextResponse } from "next/server";
import { getObservationsWithTests } from "@/lib/data/repository";
import { defaultRateLimitPolicies } from "@/lib/request-security";
import { guardApiRequest, withNoStoreHeaders } from "@/lib/http/guard";

export const dynamic = "force-dynamic";

function sanitizeCsvCell(value: string | null | undefined) {
  if (!value) {
    return value ?? "";
  }

  const normalized = value.replace(/\u0000/g, "");
  if (/^[=+\-@]/.test(normalized) || /^[\t\r\n]/.test(normalized)) {
    return `'${normalized}`;
  }
  return normalized;
}

export async function GET(request: Request) {
  const guard = await guardApiRequest(request, {
    auth: "api-user",
    sameOrigin: true,
    rateLimitPolicy: defaultRateLimitPolicies().exportCsv
  });
  if (!guard.ok) {
    return guard.response;
  }

  const rows = await getObservationsWithTests();
  const csv = Papa.unparse(
    rows.map(({ observation, test }) => ({
      test_name_ko: sanitizeCsvCell(test.name_ko ?? ""),
      test_name_en: sanitizeCsvCell(test.name_en),
      category: sanitizeCsvCell(test.category),
      observed_at: observation.observed_at,
      value_numeric: observation.value_numeric,
      value_text: sanitizeCsvCell(observation.value_text),
      unit: sanitizeCsvCell(observation.unit),
      ref_low: observation.ref_low,
      ref_high: observation.ref_high,
      flag: sanitizeCsvCell(observation.flag)
    }))
  );

  return new NextResponse(csv, {
    status: 200,
    headers: withNoStoreHeaders({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="lab-observations.csv"',
    })
  });
}

import Papa from "papaparse";
import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { getObservationsWithTests } from "@/lib/data/repository";
import { checkRateLimit, defaultRateLimitPolicies } from "@/lib/request-security";

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
  const limitResult = checkRateLimit(request, defaultRateLimitPolicies().exportCsv);
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
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="lab-observations.csv"',
      "Cache-Control": "no-store",
      Pragma: "no-cache"
    }
  });
}

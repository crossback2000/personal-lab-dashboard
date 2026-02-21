import Link from "next/link";
import { format } from "date-fns";
import type { ObservationRow, TestRow } from "@/types/database";
import { observationStatus } from "@/lib/status";
import { formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkline } from "@/components/dashboard/sparkline";

export function TestCard({
  test,
  latest,
  sparklineValues
}: {
  test: TestRow;
  latest: ObservationRow | null;
  sparklineValues: number[];
}) {
  const status = observationStatus(latest);

  return (
    <Link href={`/dashboard/tests/${test.id}`}>
      <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-md">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">
              {test.name_ko || test.name_en}
              {test.name_ko && test.name_en ? (
                <span className="ml-1 text-xs text-muted-foreground">({test.name_en})</span>
              ) : null}
            </CardTitle>
            <Badge variant={status.tone} className="shrink-0 whitespace-nowrap">
              {status.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <p className="text-2xl font-semibold leading-none">
              {latest?.value_numeric !== null && latest?.value_numeric !== undefined
                ? formatNumber(latest.value_numeric)
                : latest?.value_text || "-"}
            </p>
            <p className="text-xs text-muted-foreground">
              {latest?.unit || test.unit_default || "단위 미지정"}
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            정상범위: {latest?.ref_low ?? "-"} ~ {latest?.ref_high ?? "-"}
          </p>

          <Sparkline values={sparklineValues} />

          <p className="text-xs text-muted-foreground">
            최신일: {latest ? format(new Date(latest.observed_at), "yyyy-MM-dd") : "-"}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

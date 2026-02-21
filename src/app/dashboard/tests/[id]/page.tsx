import Link from "next/link";
import { notFound } from "next/navigation";
import { TestDetailChart } from "@/components/dashboard/test-detail-chart";
import { TestExplanationCard } from "@/components/dashboard/test-explanation-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonStyles } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { PERIOD_OPTIONS, type PeriodOption } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { getObservations, getTests } from "@/lib/data/repository";
import { findTestExplanation } from "@/lib/test-explanations";
import { formatNumber } from "@/lib/utils";
import { observationStatus, resolveObservationFlag } from "@/lib/status";

function resolvePeriod(input?: string): PeriodOption {
  if (input === "3m" || input === "1y" || input === "3y" || input === "all") {
    return input;
  }
  if (input === "6m") {
    return "1y";
  }
  return "all";
}

function formatObservedDate(value: string): string {
  const dateOnly = value.split("T")[0] ?? value;
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly);
  if (!matched) {
    return dateOnly;
  }
  return `${matched[1]}.${matched[2]}.${matched[3]}`;
}

export default async function TestDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const { period: rawPeriod } = await searchParams;
  const period = resolvePeriod(rawPeriod);

  const tests = await getTests();
  const test = tests.find((item) => item.id === id);

  if (!test) {
    notFound();
  }

  const observations = await getObservations(id, period, { includeRawRow: false });
  const numericRows = observations.filter((row) => row.value_numeric !== null);
  const latest = observations[0] ?? null;
  const explanation = findTestExplanation([test.name_ko, test.name_en]);

  const status = observationStatus(latest);
  const detailTable = (
    <Card>
      <CardHeader>
        <CardTitle>상세 데이터</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>날짜</TableHead>
              <TableHead>값</TableHead>
              <TableHead>단위</TableHead>
              <TableHead>정상범위</TableHead>
              <TableHead>Flag</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {observations.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{formatObservedDate(row.observed_at)}</TableCell>
                <TableCell>
                  {row.value_numeric !== null ? formatNumber(row.value_numeric) : row.value_text || "-"}
                </TableCell>
                <TableCell>{row.unit || test.unit_default || "-"}</TableCell>
                <TableCell>
                  {row.ref_low ?? "-"} ~ {row.ref_high ?? "-"}
                </TableCell>
                <TableCell>{resolveObservationFlag(row) || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">{test.name_ko || test.name_en}</h2>
          {test.name_ko && test.name_en ? (
            <p className="text-sm text-muted-foreground">{test.name_en}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map((option) => (
            <Link
              key={option.value}
              href={`/dashboard/tests/${id}?period=${option.value}`}
              className={buttonStyles({
                variant: period === option.value ? "default" : "outline",
                size: "sm"
              })}
            >
              {option.label}
            </Link>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>검사항목 상세</CardTitle>
            <Badge variant={status.tone}>{status.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">최신 값</p>
            <p className="text-lg font-semibold">
              {latest?.value_numeric !== null && latest?.value_numeric !== undefined
                ? formatNumber(latest.value_numeric)
                : latest?.value_text || "-"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">단위</p>
            <p className="text-lg font-semibold">{latest?.unit || test.unit_default || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">정상범위</p>
            <p className="text-lg font-semibold">
              {latest?.ref_low ?? "-"} ~ {latest?.ref_high ?? "-"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">최신일</p>
            <p className="text-lg font-semibold">
              {latest ? formatObservedDate(latest.observed_at) : "-"}
            </p>
          </div>
        </CardContent>
      </Card>

      {observations.length === 0 ? (
        <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          선택한 기간에 데이터가 없습니다.
        </p>
      ) : (
        <>
          {numericRows.length === 0 ? (
            <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
              숫자형 데이터가 없어 차트를 표시할 수 없습니다.
            </p>
          ) : (
            <TestDetailChart
              rows={numericRows}
              title={test.name_ko || test.name_en}
              refLow={latest?.ref_low ?? null}
              refHigh={latest?.ref_high ?? null}
            />
          )}
          {detailTable}
        </>
      )}

      {explanation ? <TestExplanationCard explanation={explanation} /> : null}
    </div>
  );
}

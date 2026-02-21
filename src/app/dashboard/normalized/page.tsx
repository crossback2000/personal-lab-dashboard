import Link from "next/link";
import { NormalizedComparisonChart } from "@/components/dashboard/normalized-comparison-chart";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { PERIOD_OPTIONS, type PeriodOption, categoryLabel } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { getNormalizedSeries } from "@/lib/data/repository";

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

export default async function NormalizedPage({
  searchParams
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  await requireUser();

  const { period: rawPeriod } = await searchParams;
  const period = resolvePeriod(rawPeriod);

  const series = await getNormalizedSeries({
    period,
    maxPointsPerTest: 40
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Normalized View</h2>
          <p className="text-sm text-muted-foreground">
            단위가 다른 검사값을 동일한 중심 기준 점수로 변환해 한 화면에서 비교합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map((option) => (
            <Link
              key={option.value}
              href={`/dashboard/normalized?period=${option.value}`}
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

      {series.length === 0 ? (
        <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          정규화 가능한 데이터가 없습니다. (숫자값 + ref_low/ref_high 필요)
        </p>
      ) : (
        <>
          <NormalizedComparisonChart series={series} />

          <Card>
            <CardHeader>
              <CardTitle>항목별 최신 점수</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>검사 항목</TableHead>
                    <TableHead>카테고리</TableHead>
                    <TableHead>최신 점수</TableHead>
                    <TableHead>최신일</TableHead>
                    <TableHead>비교 포인트</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {series.map((item) => (
                    <TableRow key={item.testId}>
                      <TableCell className="font-medium">
                        {item.label}
                        {item.labelSub ? (
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({item.labelSub})
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell>{categoryLabel(item.category)}</TableCell>
                      <TableCell>{item.latestValue.toFixed(2)}</TableCell>
                      <TableCell>{formatObservedDate(item.latestObservedAt)}</TableCell>
                      <TableCell>{item.points.length}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

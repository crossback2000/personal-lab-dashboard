"use client";

import { useMemo, useState } from "react";
import {
  CategoryScale,
  Chart as ChartJS,
  type ChartOptions,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip
} from "chart.js";
import { Line } from "react-chartjs-2";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { NormalizedSeries } from "@/lib/normalization";
import { cn } from "@/lib/utils";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const SERIES_COLORS = [
  "rgb(14, 116, 144)",
  "rgb(59, 130, 246)",
  "rgb(249, 115, 22)",
  "rgb(220, 38, 38)",
  "rgb(22, 163, 74)",
  "rgb(147, 51, 234)",
  "rgb(219, 39, 119)",
  "rgb(100, 116, 139)",
  "rgb(234, 88, 12)",
  "rgb(13, 148, 136)"
];

const DEFAULT_SELECTED_COUNT = 8;

export function NormalizedComparisonChart({ series }: { series: NormalizedSeries[] }) {
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    [...series]
      .sort(
        (a, b) =>
          new Date(b.latestObservedAt).getTime() - new Date(a.latestObservedAt).getTime()
      )
      .slice(0, Math.min(DEFAULT_SELECTED_COUNT, series.length))
      .map((item) => item.testId)
  );

  const sortedSeries = useMemo(
    () =>
      [...series].sort(
        (a, b) =>
          new Date(b.latestObservedAt).getTime() - new Date(a.latestObservedAt).getTime()
      ),
    [series]
  );

  const visibleSeries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return sortedSeries;
    }

    return sortedSeries.filter((item) => {
      const target = `${item.label} ${item.labelSub || ""}`.toLowerCase();
      return target.includes(normalizedQuery);
    });
  }, [query, sortedSeries]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectedSeries = useMemo(
    () => sortedSeries.filter((item) => selectedSet.has(item.testId)),
    [selectedSet, sortedSeries]
  );

  const labels = useMemo(() => {
    const labelSet = new Set<string>();
    for (const item of selectedSeries) {
      for (const point of item.points) {
        labelSet.add(point.observedAt);
      }
    }

    return [...labelSet].sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );
  }, [selectedSeries]);

  const labelIndex = useMemo(
    () => new Map(labels.map((label, index) => [label, index])),
    [labels]
  );

  const data = useMemo(
    () => ({
      labels: labels.map((value) => formatObservedDate(value)),
      datasets: selectedSeries.map((item, index) => {
        const values: Array<number | null> = new Array(labels.length).fill(null);

        for (const point of item.points) {
          const pointIndex = labelIndex.get(point.observedAt);
          if (pointIndex !== undefined) {
            values[pointIndex] = Number(point.value.toFixed(4));
          }
        }

        const color = SERIES_COLORS[index % SERIES_COLORS.length];

        return {
          label: item.label,
          data: values,
          borderColor: color,
          backgroundColor: color,
          tension: 0.25,
          pointRadius: 2.5,
          pointHoverRadius: 4.5,
          spanGaps: true
        };
      })
    }),
    [labelIndex, labels, selectedSeries]
  );

  const options: ChartOptions<"line"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false
      },
      animation: {
        duration: 350
      },
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            boxWidth: 14,
            boxHeight: 4
          }
        },
        tooltip: {
          callbacks: {
            title(items) {
              const date = items[0]?.label;
              return date ? `검사일: ${date}` : "";
            },
            label(context) {
              const value = context.raw;
              const normalizedValue =
                typeof value === "number" && Number.isFinite(value)
                  ? value.toFixed(2)
                  : "-";
              return `${context.dataset.label}: ${normalizedValue}`;
            }
          }
        }
      },
      scales: {
        x: {
          type: "category",
          ticks: {
            maxTicksLimit: 10,
            maxRotation: 0
          },
          grid: {
            display: false
          }
        },
        y: {
          type: "linear",
          min: 0,
          max: 1,
          ticks: {
            stepSize: 0.2
          },
          title: {
            display: true,
            text: "Normalized (0~1)"
          }
        }
      }
    }),
    []
  );

  const toggleSeries = (testId: string) => {
    setSelectedIds((previous) =>
      previous.includes(testId)
        ? previous.filter((id) => id !== testId)
        : [...previous, testId]
    );
  };

  const selectAllVisible = () => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      for (const item of visibleSeries) {
        next.add(item.testId);
      }
      return [...next];
    });
  };

  const clearVisible = () => {
    const visibleIdSet = new Set(visibleSeries.map((item) => item.testId));
    setSelectedIds((previous) =>
      previous.filter((id) => !visibleIdSet.has(id))
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto]">
        <Input
          placeholder="비교할 항목 검색 (한글/영문)"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Button type="button" variant="outline" size="sm" onClick={selectAllVisible}>
          검색결과 전체선택
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={clearVisible}>
          검색결과 해제
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-medium">비교 항목 선택</p>
          <Badge>{selectedSeries.length}개 선택됨</Badge>
        </div>

        <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
          {visibleSeries.length === 0 ? (
            <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
              검색 결과가 없습니다.
            </p>
          ) : (
            visibleSeries.map((item) => {
              const checked = selectedSet.has(item.testId);
              return (
                <label
                  key={item.testId}
                  className={cn(
                    "flex cursor-pointer items-center justify-between rounded-md border px-3 py-2 text-sm transition",
                    checked
                      ? "border-primary/40 bg-primary/5"
                      : "border-border hover:bg-muted/40"
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSeries(item.testId)}
                      className="h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                    />
                    <span className="truncate font-medium">{item.label}</span>
                    {item.labelSub ? (
                      <span className="truncate text-xs text-muted-foreground">
                        ({item.labelSub})
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    최신: {formatObservedDate(item.latestObservedAt)}
                  </span>
                </label>
              );
            })
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        {selectedSeries.length === 0 || labels.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            비교할 항목을 1개 이상 선택해 주세요.
          </p>
        ) : (
          <Line
            data={data}
            options={options}
            height={360}
          />
        )}
      </div>
    </div>
  );
}

function formatObservedDate(value: string) {
  const dateOnly = value.split("T")[0] ?? value;
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly);
  if (!matched) {
    return dateOnly;
  }

  return `${matched[1]}.${matched[2]}.${matched[3]}`;
}

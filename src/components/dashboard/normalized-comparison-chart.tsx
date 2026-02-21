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
  Tooltip,
  type Plugin
} from "chart.js";
import { Line } from "react-chartjs-2";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { NormalizedSeries } from "@/lib/normalization";
import { cn } from "@/lib/utils";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

type NormalBandPluginOptions = {
  low?: number;
  high?: number;
  color?: string;
};

const normalBandPlugin: Plugin<"line"> = {
  id: "normal-band",
  beforeDatasetsDraw(chart, _args, options) {
    const opts = options as NormalBandPluginOptions;
    if (opts.low === undefined || opts.high === undefined) {
      return;
    }

    const { ctx, chartArea, scales } = chart;
    const yScale = scales.y;
    if (!yScale || !chartArea) {
      return;
    }

    const yLow = yScale.getPixelForValue(opts.low);
    const yHigh = yScale.getPixelForValue(opts.high);

    ctx.save();
    ctx.fillStyle = opts.color ?? "rgba(16, 185, 129, 0.10)";
    ctx.fillRect(
      chartArea.left,
      Math.min(yHigh, yLow),
      chartArea.right - chartArea.left,
      Math.abs(yLow - yHigh)
    );
    ctx.restore();
  }
};

ChartJS.register(normalBandPlugin);

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

const DEFAULT_SELECTED_COUNT = 6;
const MAX_OVERLAY_SERIES = 5;

type ViewMode = "stacked" | "overlay";

export function NormalizedComparisonChart({ series }: { series: NormalizedSeries[] }) {
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("stacked");
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

  const overlaySeries = useMemo(
    () => selectedSeries.slice(0, MAX_OVERLAY_SERIES),
    [selectedSeries]
  );

  const overlayLabels = useMemo(() => {
    const labelSet = new Set<string>();
    for (const item of overlaySeries) {
      for (const point of item.points) {
        labelSet.add(point.observedAt);
      }
    }

    return [...labelSet].sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );
  }, [overlaySeries]);

  const overlayLabelIndex = useMemo(
    () => new Map(overlayLabels.map((label, index) => [label, index])),
    [overlayLabels]
  );

  const overlayData = useMemo(
    () => ({
      labels: overlayLabels.map((value) => formatObservedDate(value)),
      datasets: overlaySeries.map((item, index) => {
        const values: Array<number | null> = new Array(overlayLabels.length).fill(null);

        for (const point of item.points) {
          const pointIndex = overlayLabelIndex.get(point.observedAt);
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
          pointRadius: 2,
          pointHoverRadius: 4,
          spanGaps: true
        };
      })
    }),
    [overlayLabelIndex, overlayLabels, overlaySeries]
  );

  const overlayYBounds = useMemo(() => {
    const values = overlaySeries.flatMap((item) => item.points.map((point) => point.value));
    return computeYBounds(values, {
      includeReferenceBand: true,
      minSpan: 2,
      paddingRatio: 0.12
    });
  }, [overlaySeries]);

  const overlayOptions = useMemo<ChartOptions<"line">>(() => {
    const options: ChartOptions<"line"> = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false
      },
      animation: {
        duration: 320
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
              const score =
                typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "-";
              return `${context.dataset.label}: ${score}`;
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
          min: overlayYBounds.min,
          max: overlayYBounds.max,
          ticks: {
            maxTicksLimit: 8
          },
          title: {
            display: true,
            text: "Centered Score (0=중앙, ±1=정상범위 경계)"
          }
        }
      }
    };

    (options.plugins as Record<string, unknown>)["normal-band"] = {
      low: -1,
      high: 1,
      color: "rgba(16, 185, 129, 0.10)"
    } satisfies NormalBandPluginOptions;

    return options;
  }, [overlayYBounds.max, overlayYBounds.min]);

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
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
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
                    "flex cursor-pointer items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm transition",
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
                    최신 {item.latestValue.toFixed(2)}
                  </span>
                </label>
              );
            })
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={viewMode === "stacked" ? "default" : "outline"}
            onClick={() => setViewMode("stacked")}
          >
            개별 보기
          </Button>
          <Button
            type="button"
            size="sm"
            variant={viewMode === "overlay" ? "default" : "outline"}
            onClick={() => setViewMode("overlay")}
          >
            겹쳐 보기
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          0은 기준범위의 중앙, ±1은 기준범위 경계입니다.
        </p>
      </div>

      {viewMode === "stacked" ? (
        selectedSeries.length === 0 ? (
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">
              비교할 항목을 1개 이상 선택해 주세요.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {selectedSeries.map((item, index) => (
              <SeriesPanel
                key={item.testId}
                series={item}
                color={SERIES_COLORS[index % SERIES_COLORS.length]}
              />
            ))}
          </div>
        )
      ) : (
        <div className="rounded-lg border bg-card p-4">
          {selectedSeries.length > MAX_OVERLAY_SERIES ? (
            <p className="mb-3 text-xs text-muted-foreground">
              겹쳐 보기에서는 최신 검사일 기준 상위 {MAX_OVERLAY_SERIES}개 항목만 표시합니다.
            </p>
          ) : null}
          {overlaySeries.length === 0 || overlayLabels.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              비교할 항목을 1개 이상 선택해 주세요.
            </p>
          ) : (
            <Line
              data={overlayData}
              options={overlayOptions}
              height={360}
            />
          )}
        </div>
      )}
    </div>
  );
}

function SeriesPanel({
  series,
  color
}: {
  series: NormalizedSeries;
  color: string;
}) {
  const labels = useMemo(
    () => series.points.map((point) => formatObservedDate(point.observedAt)),
    [series.points]
  );

  const values = useMemo(
    () => series.points.map((point) => Number(point.value.toFixed(4))),
    [series.points]
  );

  const yBounds = useMemo(
    () =>
      computeYBounds(values, {
        minSpan: 0.35,
        paddingRatio: 0.2
      }),
    [values]
  );

  const variation = useMemo(() => {
    if (values.length === 0) {
      return 0;
    }
    return Math.max(...values) - Math.min(...values);
  }, [values]);

  const status = resolveScoreStatus(series.latestValue);

  const data = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: series.label,
          data: values,
          borderColor: color,
          backgroundColor: color,
          tension: 0.25,
          pointRadius: 2.5,
          pointHoverRadius: 4,
          spanGaps: true
        }
      ]
    }),
    [color, labels, series.label, values]
  );

  const options = useMemo<ChartOptions<"line">>(() => {
    const next: ChartOptions<"line"> = {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 250
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            title(items) {
              const date = items[0]?.label;
              return date ? `검사일: ${date}` : "";
            },
            label(context) {
              const value = context.raw;
              const score =
                typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "-";
              return `점수: ${score}`;
            }
          }
        }
      },
      scales: {
        x: {
          type: "category",
          ticks: {
            maxTicksLimit: 6,
            maxRotation: 0
          },
          grid: {
            display: false
          }
        },
        y: {
          type: "linear",
          min: yBounds.min,
          max: yBounds.max,
          ticks: {
            maxTicksLimit: 6
          }
        }
      }
    };

    (next.plugins as Record<string, unknown>)["normal-band"] = {
      low: -1,
      high: 1,
      color: "rgba(16, 185, 129, 0.08)"
    } satisfies NormalBandPluginOptions;

    return next;
  }, [yBounds.max, yBounds.min]);

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{series.label}</p>
          {series.labelSub ? (
            <p className="truncate text-xs text-muted-foreground">{series.labelSub}</p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            최신일 {formatObservedDate(series.latestObservedAt)} / 포인트 {series.points.length}개
          </p>
        </div>
        <Badge className={status.className}>{status.label}</Badge>
      </div>

      <div className="mb-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="rounded bg-muted px-2 py-1">최신 {series.latestValue.toFixed(2)}</span>
        <span className="rounded bg-muted px-2 py-1">변동폭 {variation.toFixed(2)}</span>
      </div>

      <Line
        data={data}
        options={options}
        height={170}
      />
    </div>
  );
}

function computeYBounds(
  values: number[],
  options?: {
    includeReferenceBand?: boolean;
    minSpan?: number;
    paddingRatio?: number;
  }
) {
  if (values.length === 0) {
    return { min: -1.5, max: 1.5 };
  }

  let min = Math.min(...values);
  let max = Math.max(...values);

  if (options?.includeReferenceBand) {
    min = Math.min(min, -1);
    max = Math.max(max, 1);
  }

  const minSpan = options?.minSpan ?? 1;
  const span = Math.max(max - min, minSpan);
  const center = (max + min) / 2;
  const baseMin = center - span / 2;
  const baseMax = center + span / 2;
  const padding = span * (options?.paddingRatio ?? 0.15);

  return {
    min: roundDown(baseMin - padding, 1),
    max: roundUp(baseMax + padding, 1)
  };
}

function resolveScoreStatus(value: number) {
  if (value < -1) {
    return {
      label: "하한 미만",
      className: "border-blue-200 bg-blue-100 text-blue-800 hover:bg-blue-100"
    };
  }

  if (value > 1) {
    return {
      label: "상한 초과",
      className: "border-red-200 bg-red-100 text-red-800 hover:bg-red-100"
    };
  }

  return {
    label: "정상 범위",
    className: "border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
  };
}

function roundDown(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.floor(value * factor) / factor;
}

function roundUp(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.ceil(value * factor) / factor;
}

function formatObservedDate(value: string) {
  const dateOnly = value.split("T")[0] ?? value;
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly);
  if (!matched) {
    return dateOnly;
  }

  return `${matched[1]}.${matched[2]}.${matched[3]}`;
}

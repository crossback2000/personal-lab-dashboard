"use client";

import {
  CategoryScale,
  Chart as ChartJS,
  type ChartOptions,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  type Plugin
} from "chart.js";
import { Line } from "react-chartjs-2";
import type { ObservationRow } from "@/types/database";
import { resolveObservationFlag } from "@/lib/status";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const refBandPlugin: Plugin<"line"> = {
  id: "ref-band",
  beforeDatasetsDraw(chart, _args, options) {
    const opts = options as { low?: number | null; high?: number | null };
    if (opts.low === null || opts.low === undefined || opts.high === null || opts.high === undefined) {
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
    ctx.fillStyle = "rgba(16, 185, 129, 0.10)";
    ctx.fillRect(chartArea.left, yHigh, chartArea.right - chartArea.left, yLow - yHigh);
    ctx.restore();
  }
};

ChartJS.register(refBandPlugin);

export function TestDetailChart({
  rows,
  title,
  refLow,
  refHigh
}: {
  rows: ObservationRow[];
  title: string;
  refLow: number | null;
  refHigh: number | null;
}) {
  const sorted = [...rows].sort(
    (a, b) => new Date(a.observed_at).getTime() - new Date(b.observed_at).getTime()
  );
  const labels = sorted.map((row) => formatObservedDateLabel(row.observed_at));

  const data = {
    labels,
    datasets: [
      {
        label: title,
        data: sorted.map((row) => row.value_numeric),
        borderColor: "rgb(8, 145, 178)",
        backgroundColor: "rgb(8, 145, 178)",
        tension: 0.2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: sorted.map((row) =>
          resolveObservationFlag(row) ? "rgb(220, 38, 38)" : "rgb(8, 145, 178)"
        ),
        spanGaps: true
      }
    ]
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 400
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          title(items) {
            const index = items[0]?.dataIndex ?? -1;
            const row = index >= 0 ? sorted[index] : undefined;
            return row ? `검사일: ${formatObservedDateKo(row.observed_at)}` : "";
          },
          label(context) {
            const row = sorted[context.dataIndex];
            const value = row?.value_numeric ?? "-";
            const flag = row ? resolveObservationFlag(row) : null;
            const flagText = flag ? ` (${flag})` : "";
            return `값: ${value}${flagText}`;
          }
        }
      }
    },
    scales: {
      x: {
        type: "category",
        ticks: {
          maxTicksLimit: 8,
          maxRotation: 0
        },
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: false,
        ticks: {
          maxTicksLimit: 8
        }
      }
    }
  };

  (options.plugins as Record<string, unknown>)["ref-band"] = {
    low: refLow,
    high: refHigh
  };

  return (
    <div className="rounded-lg border bg-card p-4">
      <Line
        data={data}
        options={options}
        height={320}
      />
    </div>
  );
}

function formatObservedDateLabel(value: string): string {
  const dateOnly = value.split("T")[0] ?? value;
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly);
  if (!matched) {
    return dateOnly;
  }
  return `${matched[1]}.${matched[2]}.${matched[3]}`;
}

function formatObservedDateKo(value: string): string {
  const dateOnly = value.split("T")[0] ?? value;
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly);
  if (!matched) {
    return dateOnly;
  }
  return `${matched[1]}년 ${Number(matched[2])}월 ${Number(matched[3])}일`;
}

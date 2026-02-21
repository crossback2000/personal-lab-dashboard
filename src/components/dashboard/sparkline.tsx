import { cn } from "@/lib/utils";

export function Sparkline({
  values,
  className
}: {
  values: number[];
  className?: string;
}) {
  if (values.length < 2) {
    return <div className={cn("h-10 rounded bg-muted/40", className)} />;
  }

  const width = 140;
  const height = 40;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || 1;

  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / spread) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn("h-10 w-full", className)} aria-hidden="true">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-primary"
        points={points}
      />
    </svg>
  );
}

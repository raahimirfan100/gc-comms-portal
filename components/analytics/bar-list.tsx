"use client";

export interface BarListItem {
  name: string;
  value: number;
}

interface BarListProps {
  data: BarListItem[];
  valueFormatter?: (value: number) => string;
  maxValue?: number;
  barColor?: string;
  className?: string;
}

export function BarList({
  data,
  valueFormatter = (v) => String(v),
  maxValue: maxProp,
  barColor = "hsl(var(--chart-1))",
  className = "",
}: BarListProps) {
  const max = maxProp ?? Math.max(...data.map((d) => d.value), 1);

  return (
    <div className={`space-y-2 ${className}`}>
      {data.map((item, i) => (
        <div key={item.name} className="group">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className="text-xs font-medium truncate text-foreground">
              {item.name}
            </span>
            <span className="text-xs tabular-nums text-muted-foreground shrink-0">
              {valueFormatter(item.value)}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
            <div
              className="h-full rounded-full transition-[width] duration-500 ease-out"
              style={{
                width: `${max > 0 ? Math.min(100, (item.value / max) * 100) : 0}%`,
                backgroundColor: barColor,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export interface DonutItem {
  name: string;
  value: number;
}

const DEFAULT_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#0891b2",
  "#ca8a04",
  "#6366f1",
];

interface DonutWithCenterProps {
  data: DonutItem[];
  height?: number;
  centerLabel?: string;
  centerValue?: string;
  valueFormatter?: (value: number) => string;
  colors?: string[];
}

export function DonutWithCenter({
  data,
  height = 150,
  centerLabel,
  centerValue,
  valueFormatter = (v) => String(v),
  colors = DEFAULT_COLORS,
}: DonutWithCenterProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const displayValue = centerValue ?? (total > 0 ? valueFormatter(total) : "—");
  const displayLabel = centerLabel ?? "Total";

  const ariaLabel = `Chart: ${displayLabel} ${displayValue}. ${data.map((d) => `${d.name}: ${d.value}`).join(", ")}`;

  const isCompact = height <= 100;

  return (
    <div
      className={`flex flex-col ${isCompact ? "gap-0.5" : "gap-1.5"}`}
      role="img"
      aria-label={ariaLabel}
    >
      <div className="relative shrink-0" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="55%"
              outerRadius="92%"
              paddingAngle={1}
              stroke="transparent"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number | undefined) => valueFormatter(value ?? 0)}
              contentStyle={{
                borderRadius: "6px",
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--popover))",
                fontSize: "11px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className={`tabular-nums text-foreground leading-none ${isCompact ? "text-sm font-semibold" : "text-xl font-bold"}`}>
            {displayValue}
          </span>
          <span className={`text-muted-foreground mt-0.5 ${isCompact ? "text-[9px]" : "text-xs"}`}>{displayLabel}</span>
        </div>
      </div>
      <div className={`flex flex-wrap justify-center ${isCompact ? "gap-x-1.5 gap-y-0" : "gap-x-3 gap-y-1"}`}>
        {data.map((item, i) => (
          <div key={item.name} className={`flex items-center gap-1.5 text-muted-foreground ${isCompact ? "text-[9px]" : "text-xs"}`}>
            <span
              className={`shrink-0 rounded-full ${isCompact ? "h-1 w-1" : "h-2 w-2"}`}
              style={{ backgroundColor: colors[i % colors.length] }}
            />
            <span className={isCompact ? "truncate max-w-[4rem]" : ""}>{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

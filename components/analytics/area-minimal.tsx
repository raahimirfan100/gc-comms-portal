"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export interface AreaMinimalItem {
  date: string;
  volunteers: number;
  drives?: number;
}

interface AreaMinimalProps {
  data: AreaMinimalItem[];
  height?: number;
  dataKey?: string;
  color?: string;
}

export function AreaMinimal({
  data,
  height = 160,
  dataKey = "volunteers",
  color = "hsl(var(--chart-1))",
}: AreaMinimalProps) {
  const total = data.reduce((s, d) => s + (Number(d[dataKey as keyof AreaMinimalItem]) || 0), 0);
  const ariaLabel = `Chart: ${dataKey} over time. ${data.length} points, total ${total}`;
  return (
    <div style={{ height }} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            width={24}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--popover))",
              fontSize: "12px",
            }}
            formatter={(value: number | undefined) => [value ?? 0, "Volunteers"]}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            fill="url(#areaFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

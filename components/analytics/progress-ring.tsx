"use client";

interface ProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  label?: string;
  sublabel?: string;
  color?: string;
}

export function ProgressRing({
  value,
  max = 100,
  size = 120,
  strokeWidth = 10,
  className = "",
  label,
  sublabel,
  color = "hsl(var(--chart-2))",
}: ProgressRingProps) {
  const safe = Math.min(max, Math.max(0, value));
  const r = (size - strokeWidth) / 2;
  const circumference = r * 2 * Math.PI;
  const offset = circumference - (safe / max) * circumference;

  const ariaLabel = label != null
    ? `${label} (${sublabel ?? ""})`.trim()
    : `Progress: ${Math.round(safe)}%${sublabel ? ` — ${sublabel}` : ""}`;

  return (
    <div
      className={`flex flex-col items-center gap-2 ${className}`}
      role="img"
      aria-label={ariaLabel}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="-rotate-90"
          aria-hidden
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/40"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {label != null ? (
            <span className="text-2xl font-bold tabular-nums" style={{ color }}>
              {label}
            </span>
          ) : (
            <span className="text-2xl font-bold tabular-nums" style={{ color }}>
              {Math.round(safe)}%
            </span>
          )}
        </div>
      </div>
      {sublabel && (
        <p className="text-center text-xs text-muted-foreground max-w-[140px]">
          {sublabel}
        </p>
      )}
    </div>
  );
}

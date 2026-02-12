"use client"

import * as React from "react"
import { Progress as ProgressPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

interface ProgressProps extends React.ComponentProps<typeof ProgressPrimitive.Root> {
  /** When true, adds a glow effect for high values (e.g. >= 80%). Default: true when value >= 80 */
  showGlowWhenHigh?: boolean
}

function Progress({
  className,
  value,
  showGlowWhenHigh,
  ...props
}: ProgressProps) {
  const isHigh = (value ?? 0) >= 80
  const showGlow = showGlowWhenHigh !== false && isHigh

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      data-high={showGlow ? "true" : undefined}
      className={cn(
        "progress-bar-root relative h-2 w-full overflow-hidden rounded-full",
        className
      )}
      value={value}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="progress-bar-indicator h-full flex-1 rounded-full transition-[transform] duration-500 ease-out"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }

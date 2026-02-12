"use client";

import { useState, useEffect, useRef } from "react";

/**
 * Animates a number from 0 (or previous value) to the target value.
 * Respects prefers-reduced-motion by skipping animation.
 */
export function useCountUp(
  value: number,
  options?: { durationMs?: number; enabled?: boolean }
) {
  const { durationMs = 600, enabled = true } = options ?? {};
  const [display, setDisplay] = useState(value);
  const prevValue = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || value === prevValue.current) {
      setDisplay(value);
      prevValue.current = value;
      return;
    }

    const start = prevValue.current;
    const end = value;
    prevValue.current = value;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion || durationMs <= 0) {
      setDisplay(end);
      return;
    }

    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / durationMs, 1);
      const eased = 1 - (1 - t) * (1 - t);
      setDisplay(Math.round(start + (end - start) * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, durationMs, enabled]);

  return display;
}

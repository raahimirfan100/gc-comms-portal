/**
 * Estimated Ramadan dates by Gregorian year.
 * Based on astronomical new-moon calculations. Actual dates may differ
 * by 1–2 days depending on local moon-sighting traditions.
 */

export interface RamadanInfo {
  hijriYear: number;
  startDate: string; // YYYY-MM-DD, empty if outside lookup range
  endDate: string; // YYYY-MM-DD, empty if outside lookup range
}

const RAMADAN_LOOKUP: Record<number, RamadanInfo> = {
  2024: { hijriYear: 1445, startDate: "2024-03-11", endDate: "2024-04-09" },
  2025: { hijriYear: 1446, startDate: "2025-02-28", endDate: "2025-03-29" },
  2026: { hijriYear: 1447, startDate: "2026-02-17", endDate: "2026-03-18" },
  2027: { hijriYear: 1448, startDate: "2027-02-07", endDate: "2027-03-08" },
  2028: { hijriYear: 1449, startDate: "2028-01-27", endDate: "2028-02-25" },
  2029: { hijriYear: 1450, startDate: "2029-01-15", endDate: "2029-02-13" },
  2030: { hijriYear: 1451, startDate: "2030-01-05", endDate: "2030-02-03" },
  2031: { hijriYear: 1453, startDate: "2031-12-14", endDate: "2032-01-12" },
  2032: { hijriYear: 1454, startDate: "2032-12-02", endDate: "2032-12-31" },
  2033: { hijriYear: 1455, startDate: "2033-11-22", endDate: "2033-12-21" },
  2034: { hijriYear: 1456, startDate: "2034-11-11", endDate: "2034-12-10" },
  2035: { hijriYear: 1457, startDate: "2035-10-31", endDate: "2035-11-29" },
};

/**
 * Get estimated Ramadan information for a given Gregorian year.
 * Uses a lookup table for 2024–2035, approximate formula otherwise.
 */
export function getRamadanData(gregorianYear: number): RamadanInfo | null {
  if (RAMADAN_LOOKUP[gregorianYear]) {
    return RAMADAN_LOOKUP[gregorianYear];
  }

  // Approximate Hijri year for years outside the table (rough, ±1 year)
  if (gregorianYear >= 2000 && gregorianYear <= 2099) {
    const approxHijri = Math.round(
      (gregorianYear - 621.57) * 1.030689,
    );
    return { hijriYear: approxHijri, startDate: "", endDate: "" };
  }

  return null;
}

/**
 * Format a date string (YYYY-MM-DD) to a human-readable format.
 */
export function formatEstimatedDate(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Calculate the number of days between two YYYY-MM-DD date strings (inclusive).
 */
export function calculateDuration(
  startDate: string,
  endDate: string,
): number | null {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const diff =
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return diff > 0 ? diff : null;
}

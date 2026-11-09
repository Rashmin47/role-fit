/**
 * Role Fit Experience Calculation & Date Interval Normalization
 *
 * Deterministically computes verified experience months and years from candidate
 * employment dates (YYYY-MM, YYYY, month names, current roles).
 *
 * Invariants:
 * - Overlapping roles are merged without double-counting.
 * - "Present" / current roles use an injected reference date (defaults to current date).
 * - Discrepancies between stated and timeline years > 6 months (0.5y) are flagged.
 */

import type { Experience } from "@/lib/domain/types";

export interface DatePoint {
  year: number;
  month: number; // 0-11
}

export interface NormalizedInterval {
  startMonth: number; // absolute month: year * 12 + month
  endMonth: number;   // absolute month: year * 12 + month + 1
  startDateStr: string;
  endDateStr: string;
  months: number;
  isCurrent: boolean;
}

export interface ExperienceCalculationResult {
  totalMonths: number;
  calculatedYears: number;
  rawMonthsWithoutDedupe: number;
  overlappingMonths: number;
  hasOverlaps: boolean;
  hasCurrentRole: boolean;
  timelineExplanation: string;
  discrepancy?: {
    statedYears: number;
    calculatedYears: number;
    differenceYears: number;
    isSignificant: boolean; // > 0.5 years (6 months)
    note: string;
  };
}

export interface CalculateExperienceOptions {
  asOf?: Date;
  maxYears?: number;
}

const MONTH_NAMES: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

/**
 * Parse a string date token into a DatePoint (year, month 0-11).
 * If isEnd is true and only a year is given, defaults to December.
 */
export function parseDateString(
  token: string | undefined | null,
  isEnd: boolean = false,
  asOf: Date = new Date()
): DatePoint | null {
  if (!token) return null;
  const trimmed = token.trim();
  if (!trimmed) return null;

  if (/^(present|current|now|ongoing)$/i.test(trimmed)) {
    return {
      year: asOf.getFullYear(),
      month: asOf.getMonth(),
    };
  }

  // Check for ISO / YYYY-MM-DD or YYYY-MM
  const yyyyMmMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})(?:[-/.]\d{1,2})?$/);
  if (yyyyMmMatch) {
    const year = parseInt(yyyyMmMatch[1], 10);
    const month = Math.max(0, Math.min(11, parseInt(yyyyMmMatch[2], 10) - 1));
    return { year, month };
  }

  // Check for MM/YYYY
  const mmYyyyMatch = trimmed.match(/^(\d{1,2})[-/.](\d{4})$/);
  if (mmYyyyMatch) {
    const month = Math.max(0, Math.min(11, parseInt(mmYyyyMatch[1], 10) - 1));
    const year = parseInt(mmYyyyMatch[2], 10);
    return { year, month };
  }

  // Check for Month Name + Year e.g. "Jan 2020", "January 2020" or "2020 Jan"
  const yearMatch = trimmed.match(/\b(19\d{2}|20\d{2})\b/);
  if (!yearMatch) return null;
  const year = parseInt(yearMatch[1], 10);

  const wordMatch = trimmed.match(/[A-Za-z]{3,}/);
  if (wordMatch) {
    const word = wordMatch[0].toLowerCase();
    if (MONTH_NAMES[word] !== undefined) {
      return { year, month: MONTH_NAMES[word] };
    }
    const shortWord = word.slice(0, 3);
    if (MONTH_NAMES[shortWord] !== undefined) {
      return { year, month: MONTH_NAMES[shortWord] };
    }
  }

  // Just a year: start of year (Jan) for start date, end of year (Dec) for end date
  return { year, month: isEnd ? 11 : 0 };
}

/**
 * Calculates total experience years from structured candidate experience intervals,
 * merging overlapping intervals to prevent double counting.
 */
export function calculateExperienceFromDates(
  experience: Experience[],
  statedTotalYears?: number,
  options: CalculateExperienceOptions = {}
): ExperienceCalculationResult {
  const asOf = options.asOf ?? new Date();
  const maxYears = options.maxYears ?? 50;

  const validIntervals: NormalizedInterval[] = [];
  let rawMonths = 0;
  let hasCurrent = false;

  for (const exp of experience) {
    const isCurrent = Boolean(
      exp.isCurrent ||
      exp.current ||
      (exp.endDate && /present|current|now/i.test(exp.endDate))
    );
    if (isCurrent) hasCurrent = true;

    const startPoint = parseDateString(exp.startDate, false, asOf);
    const endPoint = isCurrent
      ? { year: asOf.getFullYear(), month: asOf.getMonth() }
      : parseDateString(exp.endDate, true, asOf);

    if (startPoint && endPoint) {
      const startMonth = startPoint.year * 12 + startPoint.month;
      const endMonth = endPoint.year * 12 + endPoint.month + 1; // inclusive of end month

      if (endMonth > startMonth) {
        const duration = endMonth - startMonth;
        rawMonths += duration;
        validIntervals.push({
          startMonth,
          endMonth,
          startDateStr: `${startPoint.year}-${String(startPoint.month + 1).padStart(2, "0")}`,
          endDateStr: isCurrent
            ? "Present"
            : `${endPoint.year}-${String(endPoint.month + 1).padStart(2, "0")}`,
          months: duration,
          isCurrent,
        });
        continue;
      }
    }

    // Fallback if dates are absent but item has explicit years
    if (typeof exp.years === "number" && exp.years > 0) {
      const itemMonths = Math.round(exp.years * 12);
      rawMonths += itemMonths;
    }
  }

  // If no date intervals could be parsed, fall back to stated years or summed item years
  if (validIntervals.length === 0) {
    const fallbackYears =
      statedTotalYears !== undefined && statedTotalYears >= 0
        ? statedTotalYears
        : Math.round((rawMonths / 12) * 10) / 10;

    const clampedYears = Math.min(maxYears, Math.max(0, fallbackYears));
    return {
      totalMonths: Math.round(clampedYears * 12),
      calculatedYears: clampedYears,
      rawMonthsWithoutDedupe: Math.round(clampedYears * 12),
      overlappingMonths: 0,
      hasOverlaps: false,
      hasCurrentRole: hasCurrent,
      timelineExplanation: `${clampedYears.toFixed(1)} years (no dated intervals found; using extracted statement)`,
    };
  }

  // Merge overlapping intervals: sort by startMonth ascending
  validIntervals.sort((a, b) => a.startMonth - b.startMonth);

  let mergedMonths = 0;
  let currentStart = validIntervals[0].startMonth;
  let currentEnd = validIntervals[0].endMonth;

  for (let i = 1; i < validIntervals.length; i++) {
    const interval = validIntervals[i];
    if (interval.startMonth <= currentEnd) {
      // Overlapping or contiguous interval
      currentEnd = Math.max(currentEnd, interval.endMonth);
    } else {
      // Non-overlapping gap
      mergedMonths += currentEnd - currentStart;
      currentStart = interval.startMonth;
      currentEnd = interval.endMonth;
    }
  }
  mergedMonths += currentEnd - currentStart;

  const overlappingMonths = Math.max(0, rawMonths - mergedMonths);
  const calculatedYears = Math.min(
    maxYears,
    Math.round((mergedMonths / 12) * 10) / 10
  );

  let discrepancy: ExperienceCalculationResult["discrepancy"];
  if (statedTotalYears !== undefined && statedTotalYears >= 0) {
    const diff = Math.round(Math.abs(statedTotalYears - calculatedYears) * 10) / 10;
    const isSignificant = diff > 0.5;
    discrepancy = {
      statedYears: statedTotalYears,
      calculatedYears,
      differenceYears: diff,
      isSignificant,
      note: isSignificant
        ? `Stated experience (${statedTotalYears.toFixed(1)}y) differs from calculated work timeline (${calculatedYears.toFixed(1)}y) by ${diff.toFixed(1)} years.`
        : `Stated experience (${statedTotalYears.toFixed(1)}y) aligns closely with verified timeline (${calculatedYears.toFixed(1)}y).`,
    };
  }

  const overlapNote = overlappingMonths > 0
    ? ` (${Math.round((overlappingMonths / 12) * 10) / 10}y concurrent overlap deduplicated)`
    : "";

  return {
    totalMonths: mergedMonths,
    calculatedYears,
    rawMonthsWithoutDedupe: rawMonths,
    overlappingMonths,
    hasOverlaps: overlappingMonths > 0,
    hasCurrentRole: hasCurrent,
    timelineExplanation: `${calculatedYears.toFixed(1)} years calculated from ${validIntervals.length} position(s)${overlapNote}.`,
    discrepancy,
  };
}


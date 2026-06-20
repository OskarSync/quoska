/**
 * Compliance Service — Pure functions for ArbZG compliance warnings.
 *
 * Calculates break requirements, daily/weekly limits, and rest period
 * warnings based on German labor law (Arbeitszeitgesetz).
 *
 * All functions are pure — no DB calls, no side effects.
 * Timestamps are never generated here; `nowIso` is passed in by callers.
 */

import type { ComplianceWarning, ComplianceStatus } from "@/types/compliance";
import type { TimeEntry } from "@/types/database";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Absolute difference between two ISO timestamps in whole minutes. */
function diffInMinutes(isoA: string, isoB: string): number {
  const a = Date.parse(isoA);
  const b = Date.parse(isoB);
  return Math.round(Math.abs(b - a) / 60_000);
}

// ---------------------------------------------------------------------------
// Break calculation — §4 ArbZG
// ---------------------------------------------------------------------------

/** Required break in minutes based on total work duration. */
export function calculateRequiredBreak(workMinutes: number): number {
  if (workMinutes >= 540) return 45; // ≥9h → 45 min
  if (workMinutes >= 360) return 30; // ≥6h → 30 min
  return 0;
}

// ---------------------------------------------------------------------------
// Net work minutes
// ---------------------------------------------------------------------------

/** Gross minutes worked minus break. */
export function calculateNetWorkMinutes(
  clockIn: string,
  clockOut: string | null,
  breakMinutes: number,
  nowIso: string,
): number {
  const end = clockOut ?? nowIso;
  return diffInMinutes(clockIn, end) - breakMinutes;
}

// ---------------------------------------------------------------------------
// Break warnings — §4 ArbZG
// ---------------------------------------------------------------------------

/** Warnings about missing or insufficient breaks. */
export function getBreakWarnings(
  workMinutes: number,
  breakMinutes: number,
): ComplianceWarning[] {
  const warnings: ComplianceWarning[] = [];

  // Pre-6h info: approaching break threshold (before required break kicks in)
  if (workMinutes >= 345 && workMinutes < 360 && breakMinutes < 30) {
    warnings.push({
      level: "info",
      category: "break",
      message:
        "In 15 Minuten ist eine Pause von mindestens 30 Minuten fällig (§4 ArbZG).",
      lawRef: "§4 ArbZG",
    });
    return warnings;
  }

  // Under 6h, no further warnings
  if (workMinutes < 360) return warnings;

  const required = calculateRequiredBreak(workMinutes);

  // Already compliant
  if (breakMinutes >= required) return warnings;

  // Exactly 6h — break required
  if (workMinutes >= 360 && workMinutes < 390) {
    warnings.push({
      level: "warning",
      category: "break",
      message: "Seit 6 Stunden gearbeitet — Pause erforderlich (§4 ArbZG).",
      lawRef: "§4 ArbZG",
    });
    return warnings;
  }

  // 6h30m+ without required break — critical
  if (workMinutes >= 390) {
    warnings.push({
      level: "critical",
      category: "break",
      message:
        "Bitte sofort eine Pause einlegen! Seit über 6,5 Stunden ohne Pause (§4 ArbZG).",
      lawRef: "§4 ArbZG",
    });
  }

  return warnings;
}

// ---------------------------------------------------------------------------
// Daily limit warnings — §3 ArbZG
// ---------------------------------------------------------------------------

/** Warnings when approaching or exceeding the daily working time limit. */
export function getDailyLimitWarnings(
  workMinutes: number,
): ComplianceWarning[] {
  const warnings: ComplianceWarning[] = [];

  if (workMinutes >= 480) {
    warnings.push({
      level: "info",
      category: "daily_limit",
      message: "Seit 8 Stunden gearbeitet.",
      lawRef: "§3 ArbZG",
    });
  }

  if (workMinutes >= 600) {
    warnings.push({
      level: "warning",
      category: "daily_limit",
      message: "Seit 10 Stunden — gesetzliches Limit erreicht (§3 ArbZG).",
      lawRef: "§3 ArbZG",
    });
  }

  // §3 ArbZG allows max 10h normally, up to 12h with compensation.
  // Anything over 12h is a clear violation.
  if (workMinutes >= 720) {
    warnings.push({
      level: "critical",
      category: "daily_limit",
      message:
        "Seit über 12 Stunden gearbeitet — Arbeitszeitgesetz verletzt! Sofort ausstempeln (§3 ArbZG).",
      lawRef: "§3 ArbZG",
    });
  }

  return warnings;
}

// ---------------------------------------------------------------------------
// Rest period — §5 ArbZG
// ---------------------------------------------------------------------------

/** Warning if the gap between last clock-out and current clock-in < 11h. */
export function getRestPeriodWarning(
  lastClockOut: string | null,
  currentClockIn: string,
): ComplianceWarning | null {
  if (!lastClockOut) return null;

  const gap = diffInMinutes(lastClockOut, currentClockIn);

  if (gap < 660) {
    return {
      level: "warning",
      category: "rest_period",
      message: "Ruhezeit unter 11 Stunden seit letzter Schicht (§5 ArbZG).",
      lawRef: "§5 ArbZG",
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Weekly limit — ArbZG Reform 2026
// ---------------------------------------------------------------------------

/** Warning if weekly working time exceeds 48h. */
export function getWeeklyLimitWarnings(
  weekMinutes: number,
): ComplianceWarning | null {
  if (weekMinutes > 2880) {
    return {
      level: "warning",
      category: "weekly_limit",
      message: "Wochenstunden über 48 (ArbZG Reform 2026).",
      lawRef: "§3 ArbZG",
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Full compliance status — aggregates all warnings
// ---------------------------------------------------------------------------

interface FullComplianceParams {
  activeEntry: TimeEntry | null;
  weekEntries: TimeEntry[];
  lastCompletedEntry: TimeEntry | null;
  nowIso: string;
}

/** Aggregate all ArbZG compliance warnings for the clock UI. */
export function getFullComplianceStatus(
  params: FullComplianceParams,
): ComplianceStatus {
  const { activeEntry, weekEntries, lastCompletedEntry, nowIso } = params;

  const warnings: ComplianceWarning[] = [];

  // Calculate today's net work minutes from active entry
  let workMinutesToday = 0;
  let breakMinutesToday = 0;

  if (activeEntry) {
    breakMinutesToday = activeEntry.break_minutes;
    workMinutesToday = calculateNetWorkMinutes(
      activeEntry.clock_in,
      activeEntry.clock_out,
      activeEntry.break_minutes,
      nowIso,
    );

    // Break warnings
    warnings.push(...getBreakWarnings(workMinutesToday, breakMinutesToday));

    // Rest period warning (comparing against last completed entry)
    const restWarning = getRestPeriodWarning(
      lastCompletedEntry?.clock_out ?? null,
      activeEntry.clock_in,
    );
    if (restWarning) warnings.push(restWarning);
  }

  // Daily limit warnings
  warnings.push(...getDailyLimitWarnings(workMinutesToday));

  // Weekly total — weekEntries excludes the active running entry (filtered by
  // getWeekEntries), so we must add its net minutes separately.
  let weekMinutes = weekEntries.reduce(
    (sum, entry) => {
      if (entry.clock_out) {
        return sum + diffInMinutes(entry.clock_in, entry.clock_out);
      }
      // Shouldn't happen (weekEntries excludes running), but handle gracefully
      return sum + diffInMinutes(entry.clock_in, nowIso);
    },
    0,
  );

  // Subtract breaks from completed week entries
  weekMinutes -= weekEntries.reduce(
    (sum, entry) => sum + entry.break_minutes,
    0,
  );

  // Add the active (running) entry's net minutes to the weekly total
  if (activeEntry) {
    weekMinutes += workMinutesToday;
  }

  const weeklyWarning = getWeeklyLimitWarnings(weekMinutes);
  if (weeklyWarning) warnings.push(weeklyWarning);

  return {
    warnings,
    workMinutesToday,
    breakMinutesToday,
    weekMinutes,
  };
}

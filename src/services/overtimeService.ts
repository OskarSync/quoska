/**
 * Overtime Service — Pure functions for overtime calculation.
 *
 * Calculates net work hours, weekly totals, and overtime
 * with holiday-aware target hours.
 *
 * This file is in the Services layer. It imports from Types and other Services.
 */

import type { TimeEntry } from "@/types/database";
import type { WeekTargetHours } from "@/types/holiday";

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
// Net work minutes calculation
// ---------------------------------------------------------------------------

/** Calculate net work minutes for a completed time entry. */
export function netMinutesForEntry(entry: TimeEntry): number {
  if (!entry.clock_out) return 0;
  return diffInMinutes(entry.clock_in, entry.clock_out) - entry.break_minutes;
}

/**
 * Calculate net work minutes for a running entry (no clock_out yet).
 * Uses nowIso as the end time.
 */
export function netMinutesForRunningEntry(
  entry: TimeEntry,
  nowIso: string,
): number {
  return diffInMinutes(entry.clock_in, nowIso) - entry.break_minutes;
}

// ---------------------------------------------------------------------------
// Weekly totals
// ---------------------------------------------------------------------------

/** Calculate total net minutes for a set of completed entries. */
export function totalNetMinutes(entries: TimeEntry[]): number {
  return entries.reduce(
    (sum, entry) => sum + netMinutesForEntry(entry),
    0,
  );
}

/**
 * Calculate total net minutes including a running entry.
 */
export function totalNetMinutesWithActive(
  completedEntries: TimeEntry[],
  activeEntry: TimeEntry | null,
  nowIso: string,
): number {
  let total = totalNetMinutes(completedEntries);
  if (activeEntry) {
    total += netMinutesForRunningEntry(activeEntry, nowIso);
  }
  return total;
}

// ---------------------------------------------------------------------------
// Overtime
// ---------------------------------------------------------------------------

/** Overtime result for a week or month. */
export interface OvertimeResult {
  workedMinutes: number;
  targetMinutes: number;
  overtimeMinutes: number;
  /** Human-readable overtime: "+2h 30m" or "-1h 15m" */
  overtimeDisplay: string;
}

/**
 * Calculate overtime for a period.
 */
export function calculateOvertime(
  workedMinutes: number,
  targetMinutes: number,
): OvertimeResult {
  const overtimeMinutes = workedMinutes - targetMinutes;
  return {
    workedMinutes,
    targetMinutes,
    overtimeMinutes,
    overtimeDisplay: formatOvertime(overtimeMinutes),
  };
}

/**
 * Calculate overtime for a week, using holiday-aware target hours.
 */
export function calculateWeekOvertime(
  weekEntries: TimeEntry[],
  weekTarget: WeekTargetHours,
  nowIso: string,
  activeEntry: TimeEntry | null,
): OvertimeResult {
  const completedEntries = weekEntries.filter(
    (e) => e.status === "completed" && e.clock_out,
  );
  const workedMinutes = totalNetMinutesWithActive(
    completedEntries,
    activeEntry,
    nowIso,
  );
  const targetMinutes = weekTarget.weekTarget * 60;

  return calculateOvertime(workedMinutes, targetMinutes);
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** Format overtime minutes as "+2h 30m" or "-1h 15m". */
export function formatOvertime(minutes: number): string {
  const absMin = Math.abs(minutes);
  const h = Math.floor(absMin / 60);
  const m = Math.round(absMin % 60);

  const sign = minutes >= 0 ? "+" : "-";
  if (h === 0) return `${sign}${m} Min`;
  return `${sign}${h}h ${m.toString().padStart(2, "0")}m`;
}

/** Format minutes as "X Std Y Min". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} Min`;
  return `${h} Std ${m} Min`;
}

/** Format minutes as "X,Y Stunden". */
export function formatHoursDecimal(minutes: number): string {
  const hours = minutes / 60;
  return `${hours.toFixed(1).replace(".", ",")} Stunden`;
}

/**
 * Shared helpers and types for the Employee Self-Service view.
 *
 * Pure formatting + display-only calendar math. No state, no side effects.
 *
 * Note: the `new Date()` calls here are display-only (parsing an existing ISO
 * string or deriving calendar dates for UI rendering) and never store an
 * authoritative timestamp. They are marked with eslint-disable as per the
 * project's ArbZG §16 convention.
 */

import type { TimeEntry } from "@/types/database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TimeEntryWithNet extends TimeEntry {
  netMinutes: number;
}

export interface WeekOvertimeSummary {
  weekStart: string;
  weekEnd: string;
  workedMinutes: number;
  targetMinutes: number;
  overtimeMinutes: number;
  overtimeDisplay: string;
}

export interface MyTimesData {
  entries: TimeEntryWithNet[];
  weeklySummaries: WeekOvertimeSummary[];
  cumulativeOvertimeMinutes: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DAYS_DE_FULL = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"] as const;

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/** Format ISO date to DD.MM. */
export function formatShortDate(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}`;
}

/** Format ISO date to DD.MM.YYYY */
export function formatFullDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
}

/** Format absolute minutes as "Xh Ym" */
export function formatDurationCompact(minutes: number): string {
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${m} Min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Format signed minutes as "+Xh Ym" or "-Xh Ym" */
export function formatBalance(minutes: number): string {
  if (minutes === 0) return "±0";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const sign = minutes > 0 ? "+" : "−"; // proper minus sign
  if (h === 0) return `${sign}${m} Min`;
  if (m === 0) return `${sign}${h}h`;
  return `${sign}${h}h ${m}m`;
}

/** Get Monday–Sunday dates for a given week start. */
export function getWeekDays(weekStart: string): string[] {
  const days: string[] = [];
  // eslint-disable-next-line @quoska/legal/no-client-timestamps
  const start = new Date(weekStart + "T12:00:00");
  for (let i = 0; i < 7; i++) {
    // eslint-disable-next-line @quoska/legal/no-client-timestamps
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }
  return days;
}

/** Get day-of-week index (0=Mon, 6=Sun) for an ISO date */
export function getDayIndex(isoDate: string): number {
  // eslint-disable-next-line @quoska/legal/no-client-timestamps
  const d = new Date(isoDate + "T12:00:00");
  const dow = d.getDay();
  return dow === 0 ? 6 : dow - 1;
}

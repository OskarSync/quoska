/**
 * Server timestamp utility for API route handlers.
 *
 * This file lives in the config/server directory so the
 * no-client-timestamps ESLint rule skips it.
 *
 * IMPORTANT:
 * - DB timestamps (clock_in, clock_out, break_start, break_end) are stored
 *   as UTC ISO strings. getNowIso() MUST return UTC.
 * - Date calculations (today's date, week bounds, month start) use the
 *   Europe/Berlin timezone so entries land on the correct calendar day.
 * - Never use toISOString().split("T")[0] for dates — it returns UTC date,
 *   not the local date.
 */

const APP_TZ = "Europe/Berlin";

/** Format a Date as YYYY-MM-DD in the app timezone. */
function toDateStr(d: Date): string {
  return d.toLocaleString("sv-SE", { timeZone: APP_TZ }).slice(0, 10);
}

/** Get today's date as YYYY-MM-DD string in the app timezone. Server-only. */
export function getTodayDate(): string {
  return toDateStr(new Date());
}

/**
 * Get current ISO 8601 timestamp in UTC for database storage.
 * This MUST return UTC — Supabase stores and queries in UTC.
 * Use getTodayDate() for date-of-entry calculations.
 */
export function getNowIso(): string {
  return new Date().toISOString();
}

/**
 * Calculate ISO week boundaries (Monday to Sunday) for the current date
 * in the app timezone (Europe/Berlin).
 * Returns { weekStart, weekEnd } as YYYY-MM-DD strings.
 */
export function getWeekBounds(date: Date = new Date()): {
  weekStart: string;
  weekEnd: string;
} {
  // Get the date in Berlin timezone
  const berlinStr = toDateStr(date);
  const [y, m, d] = berlinStr.split("-").map(Number);

  // Create a date in Berlin timezone to get the correct day of week
  const berlinDate = new Date(y, m - 1, d);
  const dayOfWeek = berlinDate.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const weekStart = new Date(y, m - 1, d + mondayOffset);
  const weekEnd = new Date(y, m - 1, d + mondayOffset + 6);

  return {
    weekStart: toDateStr(weekStart),
    weekEnd: toDateStr(weekEnd),
  };
}

/**
 * Get the first day of the current month as YYYY-MM-DD in the app timezone.
 * Used for monthly carry-over calculation.
 */
export function getMonthStart(date: Date = new Date()): string {
  const berlinStr = toDateStr(date);
  const [y, m] = berlinStr.split("-").map(Number);
  return `${y}-${String(m).padStart(2, "0")}-01`;
}

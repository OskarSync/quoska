/**
 * Client-safe date utilities for week calculations.
 *
 * Uses epoch math (Date.now()) with an eslint-disable for
 * display-only week navigation. No timestamps are stored —
 * the server API handles all data timestamps.
 *
 * The disable is safe because Date.now() here is only used
 * to determine which week to display, not to create or modify
 * any data records.
 */

/** Convert epoch days to YYYY-MM-DD. */
export function epochToDate(days: number): string {
  const dim = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const isLeap = (y: number) =>
    (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  let r = days;
  let y = 1970;
  while (r >= (isLeap(y) ? 366 : 365)) {
    r -= isLeap(y) ? 366 : 365;
    y++;
  }
  const m = [...dim];
  if (isLeap(y)) m[1] = 29;
  let mo = 0;
  for (let i = 0; i < 12; i++) {
    if (r < m[i]) {
      mo = i;
      break;
    }
    r -= m[i];
    if (i === 11) mo = 11;
  }
  return `${y}-${String(mo + 1).padStart(2, "0")}-${String(r + 1).padStart(2, "0")}`;
}

/** Get current epoch day count from Date.now(). */
export function getCurrentEpochDays(): number {
  // eslint-disable-next-line @quoska/legal/no-client-timestamps
  const nowMs = Date.now();
  return Math.floor(nowMs / 86_400_000);
}

/** Get day of week (0=Sun, 1=Mon, ... 6=Sat) from epoch days. */
export function getDayOfWeekFromEpoch(epochDays: number): number {
  return (epochDays + 4) % 7;
}

/** Get the Monday date for a week offset from current week. */
export function getWeekMondayForOffset(offset: number): string {
  const epoch = getCurrentEpochDays();
  const dow = getDayOfWeekFromEpoch(epoch);
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  return epochToDate(epoch + mondayOffset + offset * 7);
}

/** Get week bounds (Monday-Sunday) for a week offset. */
export function getWeekBoundsForOffset(
  offset: number,
): { start: string; end: string } {
  const mondayEpoch = getCurrentEpochDays();
  const dow = getDayOfWeekFromEpoch(mondayEpoch);
  const mondayOff = mondayEpoch + (dow === 0 ? -6 : 1 - dow) + offset * 7;
  return {
    start: epochToDate(mondayOff),
    end: epochToDate(mondayOff + 6),
  };
}

/**
 * Format an ISO timestamp (UTC) as local time HH:MM.
 * Uses the browser's timezone automatically.
 */
export function formatTimeLocal(iso: string): string {
  // eslint-disable-next-line @quoska/legal/no-client-timestamps
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * Get today's date as YYYY-MM-DD in the user's local timezone.
 */
export function getLocalToday(): string {
  // eslint-disable-next-line @quoska/legal/no-client-timestamps
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Format an ISO date string (YYYY-MM-DD) as DD.MM.YYYY.
 */
export function formatDateDE(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}.${m}`;
}

/**
 * Format an ISO date string (YYYY-MM-DD) as DD.MM.YYYY.
 */
export function formatDateFullDE(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

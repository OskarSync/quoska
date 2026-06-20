/**
 * Holiday Service — Pure functions for holiday calculations.
 *
 * Working day calculations and target hour adjustments
 * for Bundesland-specific holidays.
 *
 * DB-backed holiday lookups are in the repo layer.
 * This service provides pure date/time math only.
 *
 * This file is in the Services layer. It imports from Types.
 */

import type { PublicHoliday } from "@/types/database";
import type { WorkingDayInfo, WeekTargetHours } from "@/types/holiday";

// ---------------------------------------------------------------------------
// Date math (pure — no Date constructor, uses Date.parse only)
// ---------------------------------------------------------------------------

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const isLeap = (y: number): boolean =>
  (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** Get day of week (0=Sun, 1=Mon, … 6=Sat) from YYYY-MM-DD string. */
function getDayOfWeek(dateStr: string): number {
  const ms = Date.parse(dateStr + "T12:00:00Z");
  if (isNaN(ms)) return 0;
  // 1970-01-01 was a Thursday (day 4)
  const daysSinceEpoch = Math.floor(ms / 86_400_000);
  return (daysSinceEpoch + 4) % 7;
}

/** Compute YYYY-MM-DD from days since epoch using lookup table. */
function computeDate(daysSinceEpoch: number): string {
  let remaining = daysSinceEpoch;
  let year = 1970;

  while (remaining >= (isLeap(year) ? 366 : 365)) {
    remaining -= isLeap(year) ? 366 : 365;
    year++;
  }

  const dim = [...DAYS_IN_MONTH];
  if (isLeap(year)) dim[1] = 29;

  let month = 0;
  for (let m = 0; m < 12; m++) {
    if (remaining < dim[m]) {
      month = m;
      break;
    }
    remaining -= dim[m];
    if (m === 11) month = 11;
  }

  const day = remaining + 1;
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Add N days to a YYYY-MM-DD string, returns YYYY-MM-DD. */
export function addDays(dateStr: string, days: number): string {
  const ms = Date.parse(dateStr + "T12:00:00Z");
  const resultDays = Math.floor((ms + days * 86_400_000) / 86_400_000);
  return computeDate(resultDays);
}

// ---------------------------------------------------------------------------
// Weekend & working day helpers
// ---------------------------------------------------------------------------

/** Check if a YYYY-MM-DD string is Saturday or Sunday. */
export function isWeekend(dateStr: string): boolean {
  const dow = getDayOfWeek(dateStr);
  return dow === 0 || dow === 6;
}

/**
 * Check if a date is a working day (Mon-Fri, not a holiday).
 * Pure function — receives pre-fetched holiday set.
 */
export function isWorkingDay(
  dateStr: string,
  holidayDates: Set<string>,
): boolean {
  if (isWeekend(dateStr)) return false;
  return !holidayDates.has(dateStr);
}

// ---------------------------------------------------------------------------
// Week calculations
// ---------------------------------------------------------------------------

/**
 * Get the Monday of the week containing the given date.
 * Returns YYYY-MM-DD.
 */
export function getWeekMonday(dateStr: string): string {
  const dow = getDayOfWeek(dateStr);
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  return addDays(dateStr, mondayOffset);
}

/**
 * Get the Sunday of the week containing the given date.
 * Returns YYYY-MM-DD.
 */
export function getWeekSunday(dateStr: string): string {
  const monday = getWeekMonday(dateStr);
  return addDays(monday, 6);
}

/**
 * Calculate working days in a week (Mon-Fri) excluding holidays.
 * Returns the count and details per day.
 */
export function calculateWeekWorkingDays(
  weekStart: string,
  holidayDates: Map<string, string>,
): { workingDays: number; days: WorkingDayInfo[] } {
  const days: WorkingDayInfo[] = [];
  let workingDays = 0;

  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    const weekend = isWeekend(date);
    const holiday = holidayDates.has(date);
    const holidayName = holidayDates.get(date) ?? null;

    const info: WorkingDayInfo = {
      date,
      isWeekend: weekend,
      isHoliday: holiday,
      holidayName,
      isWorkingDay: !weekend && !holiday,
    };

    days.push(info);
    if (info.isWorkingDay) workingDays++;
  }

  return { workingDays, days };
}

/**
 * Calculate target hours for a week, adjusted for holidays.
 */
export function calculateWeekTargetHours(
  weekStart: string,
  holidayDates: Map<string, string>,
  weeklyTargetHours: number,
): WeekTargetHours {
  const { workingDays, days } = calculateWeekWorkingDays(
    weekStart,
    holidayDates,
  );
  const dailyTarget = weeklyTargetHours / 5;

  return {
    workingDays,
    dailyTarget,
    weekTarget: workingDays * dailyTarget,
    holidays: days,
  };
}

// ---------------------------------------------------------------------------
// Utility: convert holiday array to Map/Set
// ---------------------------------------------------------------------------

/** Convert PublicHoliday array to a Map<dateString, holidayName>. */
export function holidaysToMap(
  holidays: PublicHoliday[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const h of holidays) {
    if (!map.has(h.date)) {
      map.set(h.date, h.name);
    }
  }
  return map;
}

/** Convert PublicHoliday array to a Set of date strings. */
export function holidaysToSet(holidays: PublicHoliday[]): Set<string> {
  const set = new Set<string>();
  for (const h of holidays) {
    set.add(h.date);
  }
  return set;
}

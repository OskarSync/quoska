/**
 * Absence Service — Integration layer for vacation + sick day absence detection.
 *
 * Combines data from leave_requests and sick_entries to answer:
 * - Is an employee absent on a specific date?
 * - What absences exist for a period? (for calendar view)
 *
 * This file is in the Services layer. It imports from Repos, Types.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getApprovedLeavesForTenant } from "@/repos/leaveRepo";
import { getActiveSickForTenant } from "@/repos/sickEntryRepo";
import { isWeekend } from "@/services/holidayService";
import { getTodayDate } from "@/config/server/timestamps";
import { getHolidaysInRange } from "@/repos/holidayRepo";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AbsenceType = "vacation" | "sick";

export interface AbsenceEntry {
  date: string;
  employeeId: string;
  type: AbsenceType;
}

export interface AbsenceCheckResult {
  isAbsent: boolean;
  type: AbsenceType | null;
}

// ---------------------------------------------------------------------------
// Per-date check
// ---------------------------------------------------------------------------

/**
 * Check if an employee is absent on a specific date.
 * Checks both approved leave and sick entries.
 */
export async function isAbsentOnDate(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
  date: string,
): Promise<AbsenceCheckResult> {
  // Check sick entries
  const { data: sickEntry } = await supabase
    .from("sick_entries")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("employee_id", employeeId)
    .is("deleted_at", null)
    .lte("start_date", date)
    .or(`end_date.is.null,end_date.gte.${date}`)
    .maybeSingle();

  if (sickEntry) {
    return { isAbsent: true, type: "sick" };
  }

  // Check approved leave
  const { data: leaveEntry } = await supabase
    .from("leave_requests")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("employee_id", employeeId)
    .eq("status", "approved")
    .is("deleted_at", null)
    .lte("start_date", date)
    .gte("end_date", date)
    .maybeSingle();

  if (leaveEntry) {
    return { isAbsent: true, type: "vacation" };
  }

  return { isAbsent: false, type: null };
}

// ---------------------------------------------------------------------------
// Period query (calendar)
// ---------------------------------------------------------------------------

/**
 * Get all absences for a tenant in a date range.
 * Combines approved leave requests and sick entries.
 */
export async function getAbsencesForPeriod(
  supabase: SupabaseClient,
  tenantId: string,
  startDate: string,
  endDate: string,
  bundesland?: string,
): Promise<AbsenceEntry[]> {
  const absences: AbsenceEntry[] = [];

  // Get approved leaves
  const leaves = await getApprovedLeavesForTenant(
    supabase, tenantId, startDate, endDate,
  );

  // Get sick entries
  const sickEntries = await getActiveSickForTenant(
    supabase, tenantId, startDate, endDate,
  );

  // Get holidays to exclude (so we don't report absence on holidays)
  let holidayDates = new Set<string>();
  if (bundesland) {
    const holidays = await getHolidaysInRange(supabase, bundesland, startDate, endDate);
    holidayDates = new Set(holidays.map((h) => h.date));
  }

  // Expand leaves into individual days
  for (const leave of leaves) {
    expandDateRange(leave.start_date, leave.end_date, holidayDates).forEach((date) => {
      absences.push({ date, employeeId: leave.employee_id, type: "vacation" });
    });
  }

  // Expand sick entries into individual days
  // For ongoing entries (no end_date), cap at today — don't mark future dates as sick
  const today = getTodayDate();
  for (const sick of sickEntries) {
    const effectiveEnd = sick.end_date ?? (today < endDate ? today : endDate);
    expandDateRange(sick.start_date, effectiveEnd, holidayDates).forEach((date) => {
      absences.push({ date, employeeId: sick.employee_id, type: "sick" });
    });
  }

  return absences;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Expand a date range into individual date strings.
 * Optionally excludes holidays (but includes weekends — absence covers all days).
 */
function expandDateRange(
  startDate: string,
  endDate: string,
  excludeHolidays?: Set<string>,
): string[] {
  const dates: string[] = [];
  let current = startDate;

  while (current <= endDate) {
    if (!excludeHolidays || !excludeHolidays.has(current)) {
      dates.push(current);
    }
    const ms = Date.parse(current + "T12:00:00Z") + 86_400_000;
    const d = new Date(ms); // eslint-disable-line @quoska/legal/no-client-timestamps
    current = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  return dates;
}

/**
 * Calculate work days count between two dates.
 * Excludes weekends and holidays (pure function version).
 * Reuses the holiday service pattern.
 */
export function calculateWorkDaysCountPure(
  startDate: string,
  endDate: string,
  holidayDates: Set<string>,
): number {
  let count = 0;
  let current = startDate;

  while (current <= endDate) {
    if (!isWeekend(current) && !holidayDates.has(current)) {
      count++;
    }
    const ms = Date.parse(current + "T12:00:00Z") + 86_400_000;
    const d = new Date(ms); // eslint-disable-line @quoska/legal/no-client-timestamps
    current = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  return count;
}

/**
 * Calculate calendar days between two date strings.
 * Used for Entgeltfortzahlung (42 calendar days).
 */
export function calendarDaysBetween(startDate: string, endDate: string): number {
  const startMs = Date.parse(startDate + "T12:00:00Z");
  const endMs = Date.parse(endDate + "T12:00:00Z");
  return Math.floor((endMs - startMs) / 86_400_000);
}

/**
 * Dashboard Repo — Database queries for the manager dashboard.
 *
 * Fetches team status, missing entries, and compliance-related data.
 *
 * This file is in the Repos layer. It can import from Types and Config only.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Employee, TimeEntry } from "@/types/database";

// ---------------------------------------------------------------------------
// Team Status
// ---------------------------------------------------------------------------

/** Team member status for the dashboard list. */
export interface TeamMemberStatus {
  employee: Employee;
  activeEntry: TimeEntry | null;
  todayNetMinutes: number;
}

/**
 * Get all active employees with their current time entry status.
 * For the live team overview on the manager dashboard.
 */
export async function getTeamStatus(
  supabase: SupabaseClient,
  tenantId: string,
  todayDate: string,
): Promise<TeamMemberStatus[]> {
  // Get all active employees
  const { data: employees } = await supabase
    .from("employees")
    .select("*")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (!employees || employees.length === 0) return [];

  // Get today's entries for all employees
  const employeeIds = employees.map((e: Employee) => e.id);

  const { data: todayEntries } = await supabase
    .from("time_entries")
    .select("*")
    .eq("tenant_id", tenantId)
    .in("employee_id", employeeIds)
    .eq("date", todayDate)
    .is("deleted_at", null)
    .order("clock_in", { ascending: true });

  // Get active entries (running or paused)
  const { data: activeEntries } = await supabase
    .from("time_entries")
    .select("*")
    .eq("tenant_id", tenantId)
    .in("employee_id", employeeIds)
    .in("status", ["running", "paused"])
    .is("deleted_at", null);

  const activeMap = new Map<string, TimeEntry>();
  if (activeEntries) {
    for (const entry of activeEntries) {
      activeMap.set(entry.employee_id, entry);
    }
  }

  // Build status for each employee
  return employees.map((employee: Employee) => {
    const activeEntry = activeMap.get(employee.id) ?? null;
    const entries = (todayEntries ?? []).filter(
      (e: TimeEntry) => e.employee_id === employee.id,
    );

    let todayNetMinutes = 0;
    for (const entry of entries) {
      if (entry.clock_out) {
        const grossMin = Math.round(
          Math.abs(
            Date.parse(entry.clock_out) - Date.parse(entry.clock_in),
          ) / 60_000,
        );
        todayNetMinutes += grossMin - entry.break_minutes;
      }
    }

    return { employee, activeEntry, todayNetMinutes };
  });
}

// ---------------------------------------------------------------------------
// Missing Entries
// ---------------------------------------------------------------------------

/** A missing time entry for an employee on a workday. */
export interface MissingEntry {
  employeeId: string;
  employeeFirstName: string;
  employeeLastName: string;
  date: string;
}

/**
 * Find workdays in a date range where employees have no time entries.
 * Excludes weekends and holidays (fetched separately).
 */
export async function getMissingEntries(
  supabase: SupabaseClient,
  tenantId: string,
  startDate: string,
  endDate: string,
  holidayDates: Set<string>,
): Promise<MissingEntry[]> {
  // Get all active employees
  const { data: employees } = await supabase
    .from("employees")
    .select("id, first_name, last_name")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null);

  if (!employees || employees.length === 0) return [];

  // Get all entries in the range
  const { data: entries } = await supabase
    .from("time_entries")
    .select("employee_id, date")
    .eq("tenant_id", tenantId)
    .gte("date", startDate)
    .lte("date", endDate)
    .is("deleted_at", null);

  // Build a set of (employee_id, date) pairs that have entries
  const entrySet = new Set<string>();
  if (entries) {
    for (const e of entries) {
      entrySet.add(`${e.employee_id}:${e.date}`);
    }
  }

  // Check each workday for each employee
  const missing: MissingEntry[] = [];
  const workdays = getWorkdaysInRange(startDate, endDate, holidayDates);

  for (const emp of employees) {
    for (const date of workdays) {
      if (!entrySet.has(`${emp.id}:${date}`)) {
        missing.push({
          employeeId: emp.id,
          employeeFirstName: emp.first_name,
          employeeLastName: emp.last_name,
          date,
        });
      }
    }
  }

  return missing;
}

/**
 * Get all workday dates (Mon-Fri, not holidays) in a range.
 * Returns YYYY-MM-DD strings.
 */
function getWorkdaysInRange(
  startDate: string,
  endDate: string,
  holidayDates: Set<string>,
): string[] {
  const workdays: string[] = [];
  let current = startDate;

  while (current <= endDate) {
    const dow = getDayOfWeek(current);
    const isWeekendDay = dow === 0 || dow === 6;
    const isHoliday = holidayDates.has(current);

    if (!isWeekendDay && !isHoliday) {
      workdays.push(current);
    }

    // Move to next day using Date.parse
    const ms = Date.parse(current + "T12:00:00Z");
    current = isoFromMs(ms + 86_400_000);
  }

  return workdays;
}

/** Get day of week from YYYY-MM-DD without new Date(). */
function getDayOfWeek(dateStr: string): number {
  const ms = Date.parse(dateStr + "T12:00:00Z");
  if (isNaN(ms)) return 0;
  const daysSinceEpoch = Math.floor(ms / 86_400_000);
  return (daysSinceEpoch + 4) % 7;
}

/** Convert ms to YYYY-MM-DD using Date.parse approach. */
function isoFromMs(ms: number): string {
  const daysSinceEpoch = Math.floor(ms / 86_400_000);
  return computeDate(daysSinceEpoch);
}

function computeDate(daysSinceEpoch: number): string {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const isLeap = (y: number) =>
    (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

  let remaining = daysSinceEpoch;
  let year = 1970;

  while (true) {
    const yearDays = isLeap(year) ? 366 : 365;
    if (remaining < yearDays) break;
    remaining -= yearDays;
    year++;
  }

  const dim = [...daysInMonth];
  if (isLeap(year)) dim[1] = 29;

  let month = 0;
  for (let m = 0; m < 12; m++) {
    if (remaining < dim[m]) {
      month = m;
      break;
    }
    remaining -= dim[m];
    month = m + 1;
  }

  const day = remaining + 1;
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Team Week Entries (for weekly report)
// ---------------------------------------------------------------------------

/**
 * Get all time entries for a tenant in a date range.
 * Returns raw TimeEntry rows — caller joins employee data separately.
 */
export async function getTeamTimeEntries(
  supabase: SupabaseClient,
  tenantId: string,
  startDate: string,
  endDate: string,
): Promise<TimeEntry[]> {
  const { data } = await supabase
    .from("time_entries")
    .select("*")
    .eq("tenant_id", tenantId)
    .gte("date", startDate)
    .lte("date", endDate)
    .is("deleted_at", null)
    .order("date", { ascending: true });

  return data ?? [];
}

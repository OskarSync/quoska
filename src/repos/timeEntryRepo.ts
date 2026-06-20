/**
 * Time Entry Repo — Database queries for time_entries table.
 *
 * All functions accept a Supabase client so callers can choose
 * between RLS-enforced (createClient) or admin (createAdminClient).
 *
 * This file is in the Repos layer. It can import from Types and Config only.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { TimeEntry } from "@/types/database";

/**
 * Get the active (running or paused) time entry for an employee.
 * Returns null if no active entry exists.
 */
export async function getActiveEntry(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
): Promise<TimeEntry | null> {
  const { data } = await supabase
    .from("time_entries")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("employee_id", employeeId)
    .in("status", ["running", "paused"])
    .is("deleted_at", null)
    .maybeSingle();

  return data;
}

/**
 * Get a single time entry by ID, scoped to tenant.
 */
export async function getTimeEntryById(
  supabase: SupabaseClient,
  tenantId: string,
  entryId: string,
): Promise<TimeEntry | null> {
  const { data } = await supabase
    .from("time_entries")
    .select("*")
    .eq("id", entryId)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .maybeSingle();

  return data;
}

/**
 * Get time entries for an employee within a date range.
 * Used for weekly views, overtime calculation, and reports.
 */
export async function getTimeEntriesByDateRange(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
  startDate: string,
  endDate: string,
): Promise<TimeEntry[]> {
  const { data } = await supabase
    .from("time_entries")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("employee_id", employeeId)
    .gte("date", startDate)
    .lte("date", endDate)
    .is("deleted_at", null)
    .order("date", { ascending: true })
    .order("clock_in", { ascending: true });

  return data ?? [];
}

/**
 * Get the most recent completed time entry for an employee.
 * Used for rest period (§5 ArbZG) compliance checks.
 */
export async function getLatestCompletedEntry(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
): Promise<TimeEntry | null> {
  const { data } = await supabase
    .from("time_entries")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("employee_id", employeeId)
    .eq("status", "completed")
    .is("deleted_at", null)
    .order("clock_out", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  return data;
}

/**
 * Get all completed time entries for an employee in a given week.
 * Used for weekly hours total and 48h/week compliance check.
 * Week is defined by ISO week start (Monday) and end (Sunday).
 */
export async function getWeekEntries(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
  weekStart: string,
  weekEnd: string,
): Promise<TimeEntry[]> {
  const { data } = await supabase
    .from("time_entries")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("employee_id", employeeId)
    .gte("date", weekStart)
    .lte("date", weekEnd)
    .is("deleted_at", null)
    .neq("status", "running")
    .order("date", { ascending: true });

  return data ?? [];
}

/**
 * Get completed entries for today for an employee.
 * Used in the clock status summary.
 */
export async function getTodayEntries(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
  todayDate: string,
): Promise<TimeEntry[]> {
  const { data } = await supabase
    .from("time_entries")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("employee_id", employeeId)
    .eq("date", todayDate)
    .is("deleted_at", null)
    .order("clock_in", { ascending: true });

  return data ?? [];
}

/**
 * Get completed entries for previous days in the current month (excluding today).
 * Used to calculate monthly carry-over for the running balance display.
 */
export async function getMonthEntriesBeforeToday(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
  monthStart: string,
  todayDate: string,
): Promise<TimeEntry[]> {
  const { data } = await supabase
    .from("time_entries")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("employee_id", employeeId)
    .gte("date", monthStart)
    .lt("date", todayDate)
    .is("deleted_at", null)
    .eq("status", "completed")
    .order("date", { ascending: true });

  return data ?? [];
}

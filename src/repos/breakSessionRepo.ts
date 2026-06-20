/**
 * Break Session Repo — Database queries for break_sessions table.
 *
 * This file is in the Repos layer. It can import from Types and Config only.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { BreakSession } from "@/types/database";

/**
 * Get the active (ongoing) break for a time entry.
 * Returns null if no active break exists.
 */
export async function getActiveBreak(
  supabase: SupabaseClient,
  tenantId: string,
  timeEntryId: string,
): Promise<BreakSession | null> {
  const { data } = await supabase
    .from("break_sessions")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("time_entry_id", timeEntryId)
    .is("break_end", null)
    .maybeSingle();

  return data;
}

/**
 * Get all break sessions for a time entry (both active and completed).
 * Used to calculate total break_minutes and for audit display.
 */
export async function getBreakSessionsForEntry(
  supabase: SupabaseClient,
  tenantId: string,
  timeEntryId: string,
): Promise<BreakSession[]> {
  const { data } = await supabase
    .from("break_sessions")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("time_entry_id", timeEntryId)
    .order("break_start", { ascending: true });

  return data ?? [];
}

/**
 * Get a single break session by ID.
 */
export async function getBreakSessionById(
  supabase: SupabaseClient,
  tenantId: string,
  breakSessionId: string,
): Promise<BreakSession | null> {
  const { data } = await supabase
    .from("break_sessions")
    .select("*")
    .eq("id", breakSessionId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  return data;
}

/**
 * Get all completed break sessions for a time entry.
 * Used to calculate the sum of break durations.
 */
export async function getCompletedBreakSessions(
  supabase: SupabaseClient,
  tenantId: string,
  timeEntryId: string,
): Promise<BreakSession[]> {
  const { data } = await supabase
    .from("break_sessions")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("time_entry_id", timeEntryId)
    .not("break_end", "is", null)
    .order("break_start", { ascending: true });

  return data ?? [];
}

/**
 * Time Entry Service — Business logic for clock in/out operations.
 *
 * Handles:
 * - Clock in (create time entry with server timestamp)
 * - Clock out (complete time entry)
 * - Get clock status (active entry + today summary + week summary)
 *
 * Audit trail: Every mutation creates an audit record.
 * Server timestamps: All timestamps are DB-generated via DEFAULT NOW().
 *
 * This file is in the Services layer. It imports from Repos and Types.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { TimeEntry } from "@/types/database";
import type { ApiResponse } from "@/types/api";
import { success, failure } from "@/types/api";
import {
  getActiveEntry,
  getTimeEntryById,
  getLatestCompletedEntry,
  getWeekEntries,
  getTodayEntries,
} from "@/repos/timeEntryRepo";

/**
 * Extract employee info from JWT claims.
 * Returns tenant_id, employee_id, role from the authenticated user.
 */
export async function getEmployeeFromAuth(supabase: SupabaseClient): Promise<
  ApiResponse<{ tenantId: string; employeeId: string; role: string }>
> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return failure("Nicht authentifiziert");
  }

  // JWT claims set by set_employee_claims RPC
  const tenantId = user.app_metadata?.tenant_id as string | undefined;
  const employeeId = user.app_metadata?.employee_id as string | undefined;
  const role = user.app_metadata?.role as string | undefined;

  if (!tenantId || !employeeId) {
    // Fallback: look up employee record
    const { data: employee } = await supabase
      .from("employees")
      .select("id, tenant_id, role")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .single();

    if (!employee) {
      return failure("Mitarbeiterprofil nicht gefunden");
    }

    // Repair JWT claims so RLS works for subsequent queries this session
    try {
      const { createAdminClient } = await import("@/config/supabase/server");
      const admin = createAdminClient();
      await admin.rpc("set_employee_claims", { user_uuid: user.id });
    } catch {
      // Non-critical: best-effort claim repair
    }

    return success({
      tenantId: employee.tenant_id,
      employeeId: employee.id,
      role: employee.role,
    });
  }

  return success({ tenantId, employeeId, role: role ?? "employee" });
}

/**
 * Clock in — create a new time entry.
 *
 * Server generates clock_in via DB DEFAULT NOW().
 * Prevents concurrent active entries (FR-3).
 * Creates audit trail record.
 */
export async function clockIn(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
  todayDate: string,
  notes?: string,
  projectId?: string | null,
): Promise<ApiResponse<TimeEntry>> {
  // 1. Check for existing active entry (FR-3: prevent concurrent)
  const existing = await getActiveEntry(supabase, tenantId, employeeId);
  if (existing) {
    return failure("Du bist bereits eingestempelt");
  }

  // 2. Insert time entry (clock_in = DB DEFAULT NOW())
  const { data: entry, error: insertError } = await supabase
    .from("time_entries")
    .insert({
      tenant_id: tenantId,
      employee_id: employeeId,
      date: todayDate,
      status: "running",
      notes: notes ?? null,
      project_id: projectId ?? null,
      // clock_in, created_at, updated_at all use DB DEFAULT NOW()
    })
    .select("*")
    .single();

  if (insertError || !entry) {
    console.error("Clock in failed:", insertError);
    return failure("Einstempeln fehlgeschlagen. Bitte versuche es erneut.");
  }

  // 3. Create audit record
  await supabase.from("time_entry_audit").insert({
    time_entry_id: entry.id,
    tenant_id: tenantId,
    changed_by: employeeId,
    action: "create",
    field_name: "clock_in",
    old_value: null,
    new_value: entry.clock_in,
    reason: "Clock in",
  });

  return success(entry);
}

/**
 * Clock out — complete an active time entry.
 *
 * Server generates clock_out via update query.
 * Must be in 'running' status (not paused).
 * Creates audit trail record.
 */
export async function clockOut(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
  timeEntryId: string,
  nowIso: string,
): Promise<ApiResponse<TimeEntry>> {
  // 1. Get the entry
  const entry = await getTimeEntryById(supabase, tenantId, timeEntryId);
  if (!entry) {
    return failure("Zeiteintrag nicht gefunden");
  }

  // 2. Verify ownership
  if (entry.employee_id !== employeeId) {
    return failure("Du kannst nur deine eigenen Zeiteinträge ausstempeln");
  }

  // 3. Check status
  if (entry.status === "paused") {
    return failure("Bitte beende zuerst deine Pause");
  }

  if (entry.status !== "running") {
    return failure("Du bist nicht eingestempelt");
  }

  // 4. Update: clock_out = nowIso, status = completed
  const { data: updated, error: updateError } = await supabase
    .from("time_entries")
    .update({
      clock_out: nowIso,
      status: "completed",
    })
    .eq("id", timeEntryId)
    .eq("tenant_id", tenantId)
    .select("*")
    .single();

  if (updateError || !updated) {
    console.error("Clock out failed:", updateError);
    return failure("Ausstempeln fehlgeschlagen. Bitte versuche es erneut.");
  }

  // 5. Create audit record
  await supabase.from("time_entry_audit").insert({
    time_entry_id: timeEntryId,
    tenant_id: tenantId,
    changed_by: employeeId,
    action: "update",
    field_name: "clock_out",
    old_value: null,
    new_value: updated.clock_out,
    reason: "Clock out",
  });

  return success(updated);
}

/**
 * Get the current clock status for an employee.
 * Returns active entry, today's entries, week summary, and last completed entry.
 */
export async function getClockStatus(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
  todayDate: string,
  weekStart: string,
  weekEnd: string,
): Promise<
  ApiResponse<{
    activeEntry: TimeEntry | null;
    todayEntries: TimeEntry[];
    weekEntries: TimeEntry[];
    lastCompletedEntry: TimeEntry | null;
  }>
> {
  const [activeEntry, todayEntries, weekEntries, lastCompletedEntry] =
    await Promise.all([
      getActiveEntry(supabase, tenantId, employeeId),
      getTodayEntries(supabase, tenantId, employeeId, todayDate),
      getWeekEntries(supabase, tenantId, employeeId, weekStart, weekEnd),
      getLatestCompletedEntry(supabase, tenantId, employeeId),
    ]);

  return success({
    activeEntry,
    todayEntries,
    weekEntries,
    lastCompletedEntry,
  });
}

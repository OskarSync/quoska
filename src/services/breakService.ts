/**
 * Break Service — Business logic for break tracking.
 *
 * Handles:
 * - Start break (pause time entry, create break_session)
 * - End break (resume time entry, enforce min 15min, calculate duration)
 *
 * Legal basis: §4 ArbZG — breaks of at least 15 minutes per block.
 * Min 30min after 6h, min 45min after 9h.
 *
 * This file is in the Services layer. It imports from Repos and Types.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { BreakSession } from "@/types/database";
import type { ApiResponse } from "@/types/api";
import { success, failure } from "@/types/api";
import {
  getTimeEntryById,
} from "@/repos/timeEntryRepo";
import {
  getActiveBreak,
  getBreakSessionById,
  getCompletedBreakSessions,
} from "@/repos/breakSessionRepo";

/** Minimum break block duration in minutes (§4 ArbZG) */
const MIN_BREAK_BLOCK_MINUTES = 15;

/**
 * Start a break — pause a running time entry.
 *
 * 1. Verify entry exists and is running
 * 2. Check no active break already
 * 3. Update time_entry.status = 'paused'
 * 4. Insert break_session with break_start = NOW()
 * 5. Create audit record
 */
export async function startBreak(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
  timeEntryId: string,
): Promise<ApiResponse<BreakSession>> {
  // 1. Verify entry
  const entry = await getTimeEntryById(supabase, tenantId, timeEntryId);
  if (!entry) {
    return failure("Zeiteintrag nicht gefunden");
  }

  if (entry.employee_id !== employeeId) {
    return failure("Du kannst nur deine eigenen Pausen verwalten");
  }

  if (entry.status !== "running") {
    return failure("Du musst eingestempelt sein, um eine Pause zu starten");
  }

  // 2. Check no active break
  const activeBreak = await getActiveBreak(supabase, tenantId, timeEntryId);
  if (activeBreak) {
    return failure("Du bist bereits in einer Pause");
  }

  // 3. Update time entry status to 'paused'
  const { error: statusError } = await supabase
    .from("time_entries")
    .update({ status: "paused" })
    .eq("id", timeEntryId)
    .eq("tenant_id", tenantId);

  if (statusError) {
    console.error("Failed to pause time entry:", statusError);
    return failure("Pause konnte nicht gestartet werden");
  }

  // 4. Insert break session (break_start = DB DEFAULT NOW())
  const { data: breakSession, error: breakError } = await supabase
    .from("break_sessions")
    .insert({
      tenant_id: tenantId,
      time_entry_id: timeEntryId,
      // break_start = DB DEFAULT NOW()
    })
    .select("*")
    .single();

  if (breakError || !breakSession) {
    // Rollback: set status back to running
    await supabase
      .from("time_entries")
      .update({ status: "running" })
      .eq("id", timeEntryId);

    console.error("Failed to create break session:", breakError);
    return failure("Pause konnte nicht gestartet werden");
  }

  // 5. Create audit record
  await supabase.from("time_entry_audit").insert({
    time_entry_id: timeEntryId,
    tenant_id: tenantId,
    changed_by: employeeId,
    action: "pause",
    field_name: "status",
    old_value: "running",
    new_value: "paused",
    reason: "Pause starten",
  });

  return success(breakSession);
}

/**
 * End a break — resume a paused time entry.
 *
 * 1. Verify break exists and is active
 * 2. Calculate duration
 * 3. Enforce minimum 15 minutes (§4 ArbZG)
 * 4. Update break_session: break_end, duration_minutes
 * 5. Sum all completed breaks → update time_entry.break_minutes
 * 6. Update time_entry.status = 'running'
 * 7. Create audit record
 */
export async function endBreak(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
  breakSessionId: string,
  nowIso: string,
): Promise<ApiResponse<{ breakSession: BreakSession; breakMinutes: number }>> {
  // 1. Get the break session
  const breakSession = await getBreakSessionById(
    supabase,
    tenantId,
    breakSessionId,
  );
  if (!breakSession) {
    return failure("Pause nicht gefunden");
  }

  // Verify break is active (not ended yet)
  if (breakSession.break_end !== null) {
    return failure("Diese Pause ist bereits beendet");
  }

  // 2. Get the parent time entry and verify ownership
  const entry = await getTimeEntryById(
    supabase,
    tenantId,
    breakSession.time_entry_id,
  );
  if (!entry || entry.employee_id !== employeeId) {
    return failure("Ungültiger Zeiteintrag");
  }

  // 3. Calculate duration and enforce minimum
  const breakStart = Date.parse(breakSession.break_start);
  const breakEnd = Date.parse(nowIso);
  const durationMinutes = Math.round(
    Math.abs(breakEnd - breakStart) / 60000,
  );

  if (durationMinutes < MIN_BREAK_BLOCK_MINUTES) {
    return failure(
      `Pause muss mindestens ${MIN_BREAK_BLOCK_MINUTES} Minuten dauern (§4 ArbZG). Aktuell: ${durationMinutes} Minuten.`,
    );
  }

  // 4. Update break session
  const { data: updatedBreak, error: breakUpdateError } = await supabase
    .from("break_sessions")
    .update({
      break_end: nowIso,
      duration_minutes: durationMinutes,
    })
    .eq("id", breakSessionId)
    .eq("tenant_id", tenantId)
    .select("*")
    .single();

  if (breakUpdateError || !updatedBreak) {
    console.error("Failed to end break:", breakUpdateError);
    return failure("Pause konnte nicht beendet werden");
  }

  // 5. Sum all completed breaks for this entry
  const completedBreaks = await getCompletedBreakSessions(
    supabase,
    tenantId,
    breakSession.time_entry_id,
  );
  const totalBreakMinutes = completedBreaks.reduce(
    (sum, b) => sum + (b.duration_minutes ?? 0),
    0,
  );

  // 6. Update time entry: break_minutes + status = running
  const { error: entryUpdateError } = await supabase
    .from("time_entries")
    .update({
      break_minutes: totalBreakMinutes,
      status: "running",
    })
    .eq("id", breakSession.time_entry_id)
    .eq("tenant_id", tenantId);

  if (entryUpdateError) {
    console.error("Failed to update time entry after break:", entryUpdateError);
    return failure("Pause konnte nicht beendet werden");
  }

  // 7. Create audit record
  await supabase.from("time_entry_audit").insert({
    time_entry_id: breakSession.time_entry_id,
    tenant_id: tenantId,
    changed_by: employeeId,
    action: "resume",
    field_name: "status",
    old_value: "paused",
    new_value: "running",
    reason: `Pause beendet (${durationMinutes} Min)`,
  });

  return success({ breakSession: updatedBreak, breakMinutes: totalBreakMinutes });
}

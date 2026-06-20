/**
 * Time Entry Edit Service — Manager time entry edits with full audit trail.
 *
 * Handles:
 * - Edit time entry fields (clock_in, clock_out, break_minutes, notes)
 * - Mandatory reason enforcement (min 5 characters)
 * - Audit record creation for each field change
 * - Fetch audit trail for a time entry
 *
 * Legal basis: Revisionssicherheit (GoBD) — every change must be traceable.
 *
 * This file is in the Services layer. It imports from Repos and Types.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { TimeEntry, TimeEntryAudit } from "@/types/database";
import type { ApiResponse } from "@/types/api";
import { success, failure } from "@/types/api";
import { getTimeEntryById } from "@/repos/timeEntryRepo";
import { getAuditTrailForEntry } from "@/repos/auditRepo";

/** Minimum reason length for manager edits. */
const MIN_REASON_LENGTH = 5;

/** Fields that a manager is allowed to edit on a time entry. */
const EDITABLE_FIELDS = new Set([
  "clock_in",
  "clock_out",
  "break_minutes",
  "notes",
  "project_id",
]);

/**
 * Edit a time entry as a manager with mandatory reason.
 *
 * For each changed field, creates an individual audit record with
 * old_value, new_value, and the manager's reason.
 *
 * The time entry and audit records are created in the same logical
 * operation. If any audit insert fails, the edit still applies
 * (audit is best-effort after the update succeeds).
 */
export async function editTimeEntry(
  supabase: SupabaseClient,
  tenantId: string,
  managerEmployeeId: string,
  timeEntryId: string,
  changes: Record<string, unknown>,
  reason: string,
): Promise<ApiResponse<TimeEntry>> {
  // 1. Validate reason
  if (!reason || reason.trim().length < MIN_REASON_LENGTH) {
    return failure(
      `Ein Grund ist erforderlich (mindestens ${MIN_REASON_LENGTH} Zeichen)`,
    );
  }

  // 2. Validate changes contain only editable fields
  const invalidFields = Object.keys(changes).filter(
    (f) => !EDITABLE_FIELDS.has(f),
  );
  if (invalidFields.length > 0) {
    return failure(
      `Felder können nicht bearbeitet werden: ${invalidFields.join(", ")}`,
    );
  }

  // 3. Get current entry for old values
  const currentEntry = await getTimeEntryById(supabase, tenantId, timeEntryId);
  if (!currentEntry) {
    return failure("Zeiteintrag nicht gefunden");
  }

  // 4. Build update payload (only include actually changed fields)
  const updatePayload: Record<string, unknown> = {};
  const auditRecords: Array<{
    field_name: string;
    old_value: string | null;
    new_value: string | null;
  }> = [];

  for (const [field, newValue] of Object.entries(changes)) {
    if (!EDITABLE_FIELDS.has(field)) continue;

    const oldValue = currentEntry[field as keyof TimeEntry];
    const oldStr = oldValue === null || oldValue === undefined ? "" : String(oldValue);
    const newStr = newValue === null || newValue === undefined ? "" : String(newValue);

    // Only record if value actually changed
    if (oldStr !== newStr) {
      updatePayload[field] = newValue;
      auditRecords.push({
        field_name: field,
        old_value: oldStr || null,
        new_value: newStr || null,
      });
    }
  }

  // Nothing to update
  if (Object.keys(updatePayload).length === 0) {
    return success(currentEntry);
  }

  // 5. Update the time entry
  const { data: updatedEntry, error: updateError } = await supabase
    .from("time_entries")
    .update(updatePayload)
    .eq("id", timeEntryId)
    .eq("tenant_id", tenantId)
    .select("*")
    .single();

  if (updateError || !updatedEntry) {
    console.error("Time entry edit failed:", updateError);
    return failure("Bearbeitung fehlgeschlagen. Bitte versuche es erneut.");
  }

  // 6. Create audit records for each changed field
  for (const record of auditRecords) {
    await supabase.from("time_entry_audit").insert({
      time_entry_id: timeEntryId,
      tenant_id: tenantId,
      changed_by: managerEmployeeId,
      action: "update",
      field_name: record.field_name,
      old_value: record.old_value,
      new_value: record.new_value,
      reason: reason.trim(),
    });
  }

  return success(updatedEntry);
}

/**
 * Get the full audit trail for a time entry.
 * Returns audit records in chronological order with changer info.
 */
export async function getTimeEntryAuditTrail(
  supabase: SupabaseClient,
  tenantId: string,
  timeEntryId: string,
): Promise<ApiResponse<TimeEntryAudit[]>> {
  // Verify entry exists in tenant
  const entry = await getTimeEntryById(supabase, tenantId, timeEntryId);
  if (!entry) {
    return failure("Zeiteintrag nicht gefunden");
  }

  const auditTrail = await getAuditTrailForEntry(
    supabase,
    tenantId,
    timeEntryId,
  );
  return success(auditTrail);
}

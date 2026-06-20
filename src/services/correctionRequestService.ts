/**
 * Correction Request Service — Employee correction request flow.
 *
 * Handles:
 * - Submit correction request (employee)
 * - Review correction request (manager: approve/reject)
 * - List correction requests (pending for managers, own for employees)
 *
 * Approved corrections are applied via the audit-trail flow
 * from timeEntryEditService (Story 4.1).
 *
 * This file is in the Services layer. It imports from Repos and Types.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CorrectionRequest } from "@/types/database";
import type { ApiResponse } from "@/types/api";
import { success, failure } from "@/types/api";
import { getTimeEntryById } from "@/repos/timeEntryRepo";
import {
  createCorrectionRequest,
  getCorrectionRequestById,
  getPendingCorrectionRequests,
  getCorrectionRequestsByEmployee,
  updateCorrectionRequestStatus,
} from "@/repos/correctionRequestRepo";
import { editTimeEntry } from "@/services/timeEntryEditService";
import { getNowIso } from "@/config/server/timestamps";
import { notifyManagers, sendNotification } from "@/services/notificationService";
import { createAdminClient } from "@/config/supabase/server";

/**
 * Submit a correction request for a time entry.
 *
 * The time entry is NOT modified — the request sits in 'pending' status
 * until a manager approves or rejects it.
 */
export async function submitCorrectionRequest(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
  timeEntryId: string,
  proposedChange: Record<string, unknown>,
  reason: string,
): Promise<ApiResponse<CorrectionRequest>> {
  // 1. Validate reason
  if (!reason || reason.trim().length === 0) {
    return failure("Ein Grund ist für die Korrektur erforderlich");
  }

  // 2. Verify time entry exists and belongs to employee
  const entry = await getTimeEntryById(supabase, tenantId, timeEntryId);
  if (!entry) {
    return failure("Zeiteintrag nicht gefunden");
  }

  if (entry.employee_id !== employeeId) {
    return failure("Du kannst nur Korrekturen für eigene Zeiteinträge anfordern");
  }

  // 3. Create the correction request
  const request = await createCorrectionRequest(supabase, {
    tenant_id: tenantId,
    employee_id: employeeId,
    time_entry_id: timeEntryId,
    proposed_change: proposedChange,
    reason: reason.trim(),
  });

  if (!request) {
    return failure("Korrekturanfrage konnte nicht erstellt werden");
  }

  // Notify managers about the correction request
  try {
    const nowIso = getNowIso();
    const admin = createAdminClient();
    await notifyManagers(
      supabase,
      tenantId,
      "correction_request",
      "Neue Korrekturanfrage",
      `Mitarbeiter hat eine Korrektur angefordert: ${reason.trim()}`,
      nowIso,
      admin,
    );
  } catch {
    // Notification failures must not break the main flow
  }

  return success(request);
}

/**
 * Approve a correction request and apply the edit.
 *
 * Uses editTimeEntry (Story 4.1) to apply the change with full audit trail.
 */
export async function approveCorrectionRequest(
  supabase: SupabaseClient,
  tenantId: string,
  managerEmployeeId: string,
  requestId: string,
): Promise<ApiResponse<CorrectionRequest>> {
  // 1. Get the request
  const request = await getCorrectionRequestById(supabase, tenantId, requestId);
  if (!request) {
    return failure("Korrekturanfrage nicht gefunden");
  }

  if (request.status !== "pending") {
    return failure("Diese Korrekturanfrage wurde bereits bearbeitet");
  }

  // 2. Apply the edit via audit-trail flow
  const reason = `Korrekturanfrage (genehmigt): ${request.reason}`;
  const editResult = await editTimeEntry(
    supabase,
    tenantId,
    managerEmployeeId,
    request.time_entry_id,
    request.proposed_change ?? {},
    reason,
  );

  if (!editResult.data) {
    return failure("Korrektur konnte nicht angewendet werden");
  }

  // 3. Update request status to approved
  const updated = await updateCorrectionRequestStatus(supabase, tenantId, requestId, {
    status: "approved",
    reviewed_by: managerEmployeeId,
  });

  if (!updated) {
    return failure("Korrekturanfrage konnte nicht aktualisiert werden");
  }

  // Notify the employee about approval
  try {
    const nowIso = getNowIso();
    const admin = createAdminClient();
    await sendNotification(
      supabase,
      tenantId,
      request.employee_id,
      "correction_approved",
      "Korrektur genehmigt",
      "Deine Korrekturanfrage wurde genehmigt.",
      nowIso,
      admin,
    );
  } catch {
    // Notification failures must not break the main flow
  }

  return success(updated);
}

/**
 * Reject a correction request with an optional note.
 */
export async function rejectCorrectionRequest(
  supabase: SupabaseClient,
  tenantId: string,
  managerEmployeeId: string,
  requestId: string,
  reviewNote?: string,
): Promise<ApiResponse<CorrectionRequest>> {
  // 1. Get the request
  const request = await getCorrectionRequestById(supabase, tenantId, requestId);
  if (!request) {
    return failure("Korrekturanfrage nicht gefunden");
  }

  if (request.status !== "pending") {
    return failure("Diese Korrekturanfrage wurde bereits bearbeitet");
  }

  // 2. Update request status to rejected
  const updated = await updateCorrectionRequestStatus(supabase, tenantId, requestId, {
    status: "rejected",
    reviewed_by: managerEmployeeId,
    review_note: reviewNote?.trim() || null,
  });

  if (!updated) {
    return failure("Korrekturanfrage konnte nicht aktualisiert werden");
  }

  // Notify the employee about rejection
  try {
    const nowIso = getNowIso();
    const admin = createAdminClient();
    await sendNotification(
      supabase,
      tenantId,
      request.employee_id,
      "correction_rejected",
      "Korrektur abgelehnt",
      "Deine Korrekturanfrage wurde abgelehnt.",
      nowIso,
      admin,
    );
  } catch {
    // Notification failures must not break the main flow
  }

  return success(updated);
}

/**
 * Get all pending correction requests for a tenant (manager view).
 */
export async function listPendingCorrections(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<ApiResponse<CorrectionRequest[]>> {
  const requests = await getPendingCorrectionRequests(supabase, tenantId);
  return success(requests);
}

/**
 * Get all correction requests submitted by an employee.
 */
export async function listMyCorrectionRequests(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
): Promise<ApiResponse<CorrectionRequest[]>> {
  const requests = await getCorrectionRequestsByEmployee(
    supabase,
    tenantId,
    employeeId,
  );
  return success(requests);
}

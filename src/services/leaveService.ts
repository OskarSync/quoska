/**
 * Leave Service — Business logic for vacation management (Epic 9).
 *
 * Handles:
 * - Submit leave requests (employees)
 * - Review leave requests (managers: approve/reject)
 * - Cancel leave requests (own employee)
 * - Leave balance calculation
 * - List leave requests (role-filtered)
 *
 * This file is in the Services layer. It imports from Repos, Types, Config.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { LeaveRequest } from "@/types/database";
import type { ApiResponse } from "@/types/api";
import { success, failure } from "@/types/api";
import type { LeaveBalance, SubmitLeaveInput } from "@/types/leave";
import { DEFAULT_VACATION_DAYS } from "@/types/leave";
import {
  createLeaveRequest,
  getLeaveRequestById,
  getLeaveRequestsByEmployee,
  getLeaveRequestsByTenant,
  getOverlappingLeaveRequests,
  updateLeaveRequestStatus,
  getLeaveEntitlement,
  getApprovedLeaveForEmployee,
} from "@/repos/leaveRepo";
import { notifyManagers, sendNotification } from "@/services/notificationService";
import { getNowIso } from "@/config/server/timestamps";
import { calculateWorkDaysCount, getEmployeeBundesland, getEmployeeName, formatDate, getYear } from "@/services/leaveHelpers";

// ---------------------------------------------------------------------------
// Submit
// ---------------------------------------------------------------------------

export interface SubmitLeaveResult {
  request: LeaveRequest;
  warning: string | null;
}

/**
 * Submit a leave request.
 * Calculates work_days_count, checks overlaps, validates balance.
 */
export async function submitLeaveRequest(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
  data: SubmitLeaveInput,
  nowIso: string,
): Promise<ApiResponse<SubmitLeaveResult>> {
  // 1. Get employee's bundesland for holiday calc
  const bundesland = await getEmployeeBundesland(supabase, tenantId, employeeId);
  if (!bundesland) {
    return failure("Bundesland nicht gesetzt. Bitte wende dich an deinen Admin.");
  }

  // 2. Calculate work days count
  const workDaysCount = await calculateWorkDaysCount(
    supabase, bundesland, data.start_date, data.end_date,
  );

  if (workDaysCount <= 0) {
    return failure("Der Zeitraum enthält keine Arbeitstage");
  }

  // 3. Check overlapping requests (warn but don't block)
  const overlapping = await getOverlappingLeaveRequests(
    supabase, tenantId, employeeId, data.start_date, data.end_date,
  );
  const hasOverlap = overlapping.length > 0;

  // 4. Check balance
  const balance = await getLeaveBalance(supabase, tenantId, employeeId, getYear(data.start_date));
  const exceedsBalance = data.type === "urlaub" && workDaysCount > balance.available;

  // 5. Create the request
  const request = await createLeaveRequest(supabase, {
    tenant_id: tenantId,
    employee_id: employeeId,
    type: data.type,
    start_date: data.start_date,
    end_date: data.end_date,
    work_days_count: workDaysCount,
    reason: data.reason ?? null,
  });

  if (!request) {
    return failure("Urlaubsantrag konnte nicht erstellt werden");
  }

  // 6. Notify managers
  try {
    const { createAdminClient } = await import("@/config/supabase/server");
    const admin = createAdminClient();
    const name = await getEmployeeName(supabase, tenantId, employeeId);
    await notifyManagers(
      supabase, tenantId, "leave_request",
      "Neuer Urlaubsantrag",
      `${name} möchte ${workDaysCount} Tage Urlaub (${formatDate(data.start_date)} – ${formatDate(data.end_date)})`,
      nowIso, admin,
    );
  } catch {
    // Notification failures must not break the main flow
  }

  // 7. Build warning
  const warnings: string[] = [];
  if (hasOverlap) warnings.push("Du hast bereits einen Antrag für diesen Zeitraum.");
  if (exceedsBalance) warnings.push("Achtung: Dieser Antrag überschreitet deinen verbleibenden Urlaub.");

  return success({ request, warning: warnings.length > 0 ? warnings.join(" ") : null });
}

// ---------------------------------------------------------------------------
// Review
// ---------------------------------------------------------------------------

/**
 * Review a leave request (approve or reject).
 */
export async function reviewLeaveRequest(
  supabase: SupabaseClient,
  tenantId: string,
  reviewerId: string,
  requestId: string,
  action: "approve" | "reject",
  reviewNote?: string,
  nowIso?: string,
): Promise<ApiResponse<LeaveRequest>> {
  const request = await getLeaveRequestById(supabase, tenantId, requestId);
  if (!request) return failure("Urlaubsantrag nicht gefunden");
  if (request.status !== "pending") return failure("Dieser Urlaubsantrag wurde bereits bearbeitet");

  const updated = await updateLeaveRequestStatus(
    supabase, tenantId, requestId,
    {
      status: action === "approve" ? "approved" : "rejected",
      reviewed_by: reviewerId,
      reviewed_at: nowIso ?? null,
      review_note: reviewNote?.trim() || null,
    },
  );

  if (!updated) return failure("Urlaubsantrag konnte nicht aktualisiert werden");

  // Notify the employee
  try {
    const { createAdminClient } = await import("@/config/supabase/server");
    const admin = createAdminClient();
    const ts = nowIso ?? getNowIso();
    await sendNotification(
      supabase, tenantId, request.employee_id,
      action === "approve" ? "leave_approved" : "leave_rejected",
      action === "approve" ? "Urlaub genehmigt" : "Urlaub abgelehnt",
      action === "approve"
        ? `Urlaub genehmigt: ${formatDate(request.start_date)} – ${formatDate(request.end_date)} (${request.work_days_count} Tage)`
        : `Urlaub abgelehnt: ${formatDate(request.start_date)} – ${formatDate(request.end_date)}${reviewNote ? ` — ${reviewNote}` : ""}`,
      ts, admin,
    );
  } catch { /* Notification failures must not break main flow */ }

  return success(updated);
}

// ---------------------------------------------------------------------------
// Cancel
// ---------------------------------------------------------------------------

/** Cancel a leave request (own employee only). */
export async function cancelLeaveRequest(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
  requestId: string,
): Promise<ApiResponse<LeaveRequest>> {
  const request = await getLeaveRequestById(supabase, tenantId, requestId);
  if (!request) return failure("Urlaubsantrag nicht gefunden");
  if (request.employee_id !== employeeId) return failure("Du kannst nur eigene Anträge stornieren");
  if (request.status !== "pending" && request.status !== "approved") {
    return failure("Nur ausstehende oder genehmigte Anträge können storniert werden");
  }

  const updated = await updateLeaveRequestStatus(supabase, tenantId, requestId, { status: "cancelled" });
  if (!updated) return failure("Urlaubsantrag konnte nicht storniert werden");
  return success(updated);
}

// ---------------------------------------------------------------------------
// Balance
// ---------------------------------------------------------------------------

/** Get leave balance for an employee for a given year. */
export async function getLeaveBalance(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
  year: number,
): Promise<LeaveBalance> {
  const entitlement = await getLeaveEntitlement(supabase, tenantId, employeeId, year);
  const total = entitlement ? entitlement.total_days + entitlement.carried_over : DEFAULT_VACATION_DAYS;

  const allRequests = await getLeaveRequestsByEmployee(supabase, tenantId, employeeId);
  const yearRequests = allRequests.filter(
    (r) => r.type === "urlaub" && getYear(r.start_date) === year,
  );

  const used = yearRequests.filter((r) => r.status === "approved").reduce((s, r) => s + r.work_days_count, 0);
  const pending = yearRequests.filter((r) => r.status === "pending").reduce((s, r) => s + r.work_days_count, 0);
  const available = Math.max(0, total - used - pending);

  return { total, used, pending, available, carried_over: entitlement?.carried_over ?? 0 };
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

/** List leave requests, filtered by role. */
export async function listLeaveRequests(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
  role: string,
  options?: { status?: string },
): Promise<ApiResponse<LeaveRequest[]>> {
  if (role === "admin" || role === "manager") {
    return success(await getLeaveRequestsByTenant(supabase, tenantId, options));
  }
  return success(await getLeaveRequestsByEmployee(supabase, tenantId, employeeId, options));
}

// ---------------------------------------------------------------------------
// Absence helper (used by absenceService)
// ---------------------------------------------------------------------------

/** Check if an employee has approved leave on a specific date. */
export async function hasApprovedLeaveOnDate(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
  date: string,
): Promise<boolean> {
  const leaves = await getApprovedLeaveForEmployee(supabase, tenantId, employeeId, date, date);
  return leaves.length > 0;
}

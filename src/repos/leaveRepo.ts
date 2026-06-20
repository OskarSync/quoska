/**
 * Leave Request Repo — Database queries for leave_requests and leave_entitlements.
 *
 * This file is in the Repos layer. It can import from Types and Config only.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  LeaveRequest,
  LeaveEntitlement,
} from "@/types/database";

// ---------------------------------------------------------------------------
// Leave Requests
// ---------------------------------------------------------------------------

/** Create a leave request. Returns the inserted row or null on error. */
export async function createLeaveRequest(
  supabase: SupabaseClient,
  data: {
    tenant_id: string;
    employee_id: string;
    type: string;
    start_date: string;
    end_date: string;
    work_days_count: number;
    reason?: string | null;
  },
): Promise<LeaveRequest | null> {
  const { data: inserted, error } = await supabase
    .from("leave_requests")
    .insert(data)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to create leave request:", error);
    return null;
  }

  return inserted;
}

/** Get a leave request by ID, scoped to tenant. */
export async function getLeaveRequestById(
  supabase: SupabaseClient,
  tenantId: string,
  requestId: string,
): Promise<LeaveRequest | null> {
  const { data } = await supabase
    .from("leave_requests")
    .select("*")
    .eq("id", requestId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  return data;
}

/** Get leave requests for a specific employee. */
export async function getLeaveRequestsByEmployee(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
  options?: { status?: string },
): Promise<LeaveRequest[]> {
  let query = supabase
    .from("leave_requests")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("employee_id", employeeId)
    .is("deleted_at", null);

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  const { data } = await query.order("created_at", { ascending: false });
  return data ?? [];
}

/** Get leave requests for a tenant (all employees). */
export async function getLeaveRequestsByTenant(
  supabase: SupabaseClient,
  tenantId: string,
  options?: { status?: string },
): Promise<LeaveRequest[]> {
  let query = supabase
    .from("leave_requests")
    .select("*")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null);

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  const { data } = await query.order("created_at", { ascending: false });
  return data ?? [];
}

/** Check for overlapping leave requests for an employee. */
export async function getOverlappingLeaveRequests(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
  startDate: string,
  endDate: string,
): Promise<LeaveRequest[]> {
  const { data } = await supabase
    .from("leave_requests")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("employee_id", employeeId)
    .in("status", ["pending", "approved"])
    .is("deleted_at", null)
    .lte("start_date", endDate)
    .gte("end_date", startDate);

  return data ?? [];
}

/** Update a leave request's status (approve/reject/cancel). */
export async function updateLeaveRequestStatus(
  supabase: SupabaseClient,
  tenantId: string,
  requestId: string,
  updates: {
    status: string;
    reviewed_by?: string | null;
    reviewed_at?: string | null;
    review_note?: string | null;
  },
): Promise<LeaveRequest | null> {
  const { data, error } = await supabase
    .from("leave_requests")
    .update(updates)
    .eq("id", requestId)
    .eq("tenant_id", tenantId)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to update leave request:", error);
    return null;
  }

  return data;
}

/** Get approved leave for an employee in a date range. */
export async function getApprovedLeaveForEmployee(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
  startDate: string,
  endDate: string,
): Promise<LeaveRequest[]> {
  const { data } = await supabase
    .from("leave_requests")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("employee_id", employeeId)
    .eq("status", "approved")
    .is("deleted_at", null)
    .lte("start_date", endDate)
    .gte("end_date", startDate);

  return data ?? [];
}

/** Get all approved leaves for a tenant in a date range (calendar). */
export async function getApprovedLeavesForTenant(
  supabase: SupabaseClient,
  tenantId: string,
  startDate: string,
  endDate: string,
): Promise<LeaveRequest[]> {
  const { data } = await supabase
    .from("leave_requests")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("status", "approved")
    .is("deleted_at", null)
    .lte("start_date", endDate)
    .gte("end_date", startDate);

  return data ?? [];
}

// ---------------------------------------------------------------------------
// Leave Entitlements
// ---------------------------------------------------------------------------

/** Get the leave entitlement for an employee and year. */
export async function getLeaveEntitlement(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
  year: number,
): Promise<LeaveEntitlement | null> {
  const { data } = await supabase
    .from("leave_entitlements")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("employee_id", employeeId)
    .eq("year", year)
    .maybeSingle();

  return data;
}

/** Upsert a leave entitlement. Returns the upserted row. */
export async function upsertLeaveEntitlement(
  supabase: SupabaseClient,
  data: {
    tenant_id: string;
    employee_id: string;
    year: number;
    total_days: number;
    carried_over: number;
  },
): Promise<LeaveEntitlement | null> {
  const { data: upserted, error } = await supabase
    .from("leave_entitlements")
    .upsert(data, { onConflict: "employee_id,year" })
    .select("*")
    .single();

  if (error) {
    console.error("Failed to upsert leave entitlement:", error);
    return null;
  }

  return upserted;
}

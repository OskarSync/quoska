/**
 * Correction Request Repo — Database queries for correction_requests table.
 *
 * This file is in the Repos layer. It can import from Types and Config only.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CorrectionRequest } from "@/types/database";

/**
 * Create a new correction request.
 * Returns the inserted record.
 */
export async function createCorrectionRequest(
  supabase: SupabaseClient,
  data: {
    tenant_id: string;
    employee_id: string;
    time_entry_id: string;
    proposed_change: Record<string, unknown>;
    reason: string;
  },
): Promise<CorrectionRequest | null> {
  const { data: inserted, error } = await supabase
    .from("correction_requests")
    .insert(data)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to create correction request:", error);
    return null;
  }

  return inserted;
}

/**
 * Get a correction request by ID, scoped to tenant.
 */
export async function getCorrectionRequestById(
  supabase: SupabaseClient,
  tenantId: string,
  requestId: string,
): Promise<CorrectionRequest | null> {
  const { data } = await supabase
    .from("correction_requests")
    .select("*")
    .eq("id", requestId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  return data;
}

/**
 * Get all pending correction requests for a tenant.
 * Used on the manager dashboard.
 */
export async function getPendingCorrectionRequests(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<CorrectionRequest[]> {
  const { data } = await supabase
    .from("correction_requests")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  return data ?? [];
}

/**
 * Get all correction requests submitted by a specific employee.
 */
export async function getCorrectionRequestsByEmployee(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
): Promise<CorrectionRequest[]> {
  const { data } = await supabase
    .from("correction_requests")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });

  return data ?? [];
}

/**
 * Update a correction request's status (approve/reject).
 */
export async function updateCorrectionRequestStatus(
  supabase: SupabaseClient,
  tenantId: string,
  requestId: string,
  updates: {
    status: "approved" | "rejected";
    reviewed_by: string;
    review_note?: string | null;
  },
): Promise<CorrectionRequest | null> {
  const { data, error } = await supabase
    .from("correction_requests")
    .update(updates)
    .eq("id", requestId)
    .eq("tenant_id", tenantId)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to update correction request:", error);
    return null;
  }

  return data;
}

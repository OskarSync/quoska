/**
 * Audit Repo — Database queries for time_entry_audit table.
 *
 * Read-only queries (INSERT is done inline in services for atomicity).
 *
 * This file is in the Repos layer. It can import from Types and Config only.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { TimeEntryAudit } from "@/types/database";

/**
 * Get all audit records for a specific time entry, ordered chronologically.
 */
export async function getAuditTrailForEntry(
  supabase: SupabaseClient,
  tenantId: string,
  timeEntryId: string,
): Promise<TimeEntryAudit[]> {
  const { data } = await supabase
    .from("time_entry_audit")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("time_entry_id", timeEntryId)
    .order("changed_at", { ascending: true });

  return data ?? [];
}

/**
 * Get a single audit record by ID, scoped to tenant.
 */
export async function getAuditRecordById(
  supabase: SupabaseClient,
  tenantId: string,
  auditId: string,
): Promise<TimeEntryAudit | null> {
  const { data } = await supabase
    .from("time_entry_audit")
    .select("*")
    .eq("id", auditId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  return data;
}

/**
 * Get all audit records for a tenant (used for DSGVO data export).
 * Paginated with limit/offset.
 */
export async function getAuditTrailForTenant(
  supabase: SupabaseClient,
  tenantId: string,
  limit = 100,
  offset = 0,
): Promise<TimeEntryAudit[]> {
  const { data } = await supabase
    .from("time_entry_audit")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("changed_at", { ascending: false })
    .range(offset, offset + limit - 1);

  return data ?? [];
}

/**
 * Get all audit records performed by a specific employee.
 * Used for "who changed what" reporting.
 */
export async function getAuditTrailByEmployee(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
  limit = 50,
): Promise<TimeEntryAudit[]> {
  const { data } = await supabase
    .from("time_entry_audit")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("changed_by", employeeId)
    .order("changed_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

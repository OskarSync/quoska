/**
 * Export Repo — Database queries for CSV/PDF export and DSGVO data portability.
 *
 * All functions accept a Supabase client so callers can choose
 * between RLS-enforced or admin client.
 *
 * This file is in the Repos layer. It can import from Types and Config only.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Employee,
  TimeEntry,
  TimeEntryAudit,
} from "@/types/database";

// ---------------------------------------------------------------------------
// Manager CSV/PDF export queries
// ---------------------------------------------------------------------------

/**
 * Get time entries for export with employee info.
 * Filters by date range, optionally by employee.
 * Returns entries joined with employee names.
 */
export async function getEntriesForExport(
  supabase: SupabaseClient,
  tenantId: string,
  startDate: string,
  endDate: string,
  employeeId?: string,
): Promise<
  (TimeEntry & {
    employee_first_name: string;
    employee_last_name: string;
  })[]
> {
  let query = supabase
    .from("time_entries")
    .select("*")
    .eq("tenant_id", tenantId)
    .gte("date", startDate)
    .lte("date", endDate)
    .is("deleted_at", null)
    .order("date", { ascending: true })
    .order("clock_in", { ascending: true });

  if (employeeId) {
    query = query.eq("employee_id", employeeId);
  }

  const { data } = await query;

  if (!data) return [];

  // Fetch employee names separately
  const entryMap = data as TimeEntry[];
  const empIds = [...new Set(entryMap.map((e) => e.employee_id))];

  const { data: emps } = await supabase
    .from("employees")
    .select("id, first_name, last_name")
    .in("id", empIds);

  const empMap = new Map(
    (emps ?? []).map((e: { id: string; first_name: string; last_name: string }) => [
      e.id,
      { first_name: e.first_name, last_name: e.last_name },
    ]),
  );

  return entryMap.map((entry) => {
    const emp = empMap.get(entry.employee_id) ?? {
      first_name: "Unbekannt",
      last_name: "",
    };
    return {
      ...entry,
      employee_first_name: emp.first_name,
      employee_last_name: emp.last_name,
    };
  });
}

/**
 * Get all employees for a tenant (used in PDF report headers).
 */
export async function getTenantInfo(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<{ name: string } | null> {
  const { data } = await supabase
    .from("tenants")
    .select("name")
    .eq("id", tenantId)
    .single();

  return data;
}

// ---------------------------------------------------------------------------
// DSGVO data portability queries
// ---------------------------------------------------------------------------

/**
 * Get all time entries for an employee including soft-deleted ones.
 * For DSGVO Art 20 data portability — full history required.
 */
export async function getEmployeeAllEntries(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
): Promise<TimeEntry[]> {
  // Use admin client to bypass deleted_at filter
  const { data } = await supabase
    .from("time_entries")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("employee_id", employeeId)
    .order("date", { ascending: true });

  return data ?? [];
}

/**
 * Get all audit records where the employee is either the changer or the subject.
 * For DSGVO data portability.
 */
export async function getEmployeeAuditRecords(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
): Promise<TimeEntryAudit[]> {
  // Audit records where this employee made changes
  const { data: changedByEmp } = await supabase
    .from("time_entry_audit")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("changed_by", employeeId)
    .order("changed_at", { ascending: true });

  // Audit records for this employee's time entries
  const { data: empEntries } = await supabase
    .from("time_entries")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("employee_id", employeeId);

  const entryIds = (empEntries ?? []).map((e: { id: string }) => e.id);

  let changedForEmp: TimeEntryAudit[] = [];
  if (entryIds.length > 0) {
    const { data } = await supabase
      .from("time_entry_audit")
      .select("*")
      .eq("tenant_id", tenantId)
      .in("time_entry_id", entryIds)
      .order("changed_at", { ascending: true });
    changedForEmp = data ?? [];
  }

  // Deduplicate by ID
  const seen = new Set<string>();
  const all: TimeEntryAudit[] = [];
  for (const record of [...(changedByEmp ?? []), ...changedForEmp]) {
    if (!seen.has(record.id)) {
      seen.add(record.id);
      all.push(record);
    }
  }

  return all.sort((a, b) =>
    a.changed_at < b.changed_at ? -1 : 1,
  );
}

/**
 * Get employee profile data for DSGVO export.
 */
export async function getEmployeeProfile(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
): Promise<Employee | null> {
  const { data } = await supabase
    .from("employees")
    .select("*")
    .eq("id", employeeId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  return data;
}

// ---------------------------------------------------------------------------
// Retention queries
// ---------------------------------------------------------------------------

/**
 * Find time entries older than the retention period (2 years).
 * Returns IDs for soft-deletion.
 */
export async function getExpiredEntries(
  supabase: SupabaseClient,
  tenantId: string,
  cutoffDate: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("time_entries")
    .select("id")
    .eq("tenant_id", tenantId)
    .lt("clock_in", cutoffDate)
    .is("deleted_at", null);

  return (data ?? []).map((r: { id: string }) => r.id);
}

/**
 * Soft-delete time entries by IDs. Sets deleted_at to the provided timestamp.
 */
export async function softDeleteEntries(
  supabase: SupabaseClient,
  entryIds: string[],
  nowIso: string,
): Promise<number> {
  if (entryIds.length === 0) return 0;

  const { count } = await supabase
    .from("time_entries")
    .update({ deleted_at: nowIso })
    .in("id", entryIds)
    .is("deleted_at", null);

  return count ?? 0;
}

/**
 * Hard-delete all data for a tenant.
 * Used after the 14-day deletion waiting period.
 */
export async function hardDeleteTenantData(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<void> {
  // Delete in dependency order: audit → corrections → breaks → entries → employees → tenant
  const tables = [
    "time_entry_audit",
    "correction_requests",
    "break_sessions",
    "notifications",
    "subscription_events",
    "time_entries",
    "employees",
  ];

  for (const table of tables) {
    await supabase
      .from(table)
      .delete()
      .eq("tenant_id", tenantId);
  }

  await supabase.from("tenants").delete().eq("id", tenantId);
}

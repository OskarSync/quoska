/**
 * Employee Repo — Database queries for employees table.
 *
 * All functions accept a Supabase client so callers can choose
 * between RLS-enforced (createClient) or admin (createAdminClient).
 *
 * This file is in the Repos layer. It can import from Types and Config only.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Employee } from "@/types/database";
import type { Plan } from "@/types/tenant";

/**
 * Get all active employees for a tenant, ordered by last_name, first_name.
 */
export async function getEmployeesByTenant(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<Employee[]> {
  const { data } = await supabase
    .from("employees")
    .select("*")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  return data ?? [];
}

/**
 * Get all deactivated (soft-deleted) employees for a tenant.
 */
export async function getDeactivatedEmployees(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<Employee[]> {
  const { data } = await supabase
    .from("employees")
    .select("*")
    .eq("tenant_id", tenantId)
    .not("deleted_at", "is", null)
    .order("last_name", { ascending: true });

  return data ?? [];
}

/**
 * Get a single employee by ID, scoped to tenant.
 */
export async function getEmployeeById(
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

/**
 * Get an active employee by email within a tenant.
 * Used for uniqueness checks on invite.
 */
export async function getEmployeeByEmail(
  supabase: SupabaseClient,
  tenantId: string,
  email: string,
): Promise<Employee | null> {
  const { data } = await supabase
    .from("employees")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("email", email)
    .is("deleted_at", null)
    .maybeSingle();

  return data;
}

/**
 * Count active employees for a tenant.
 * Used for plan limit enforcement.
 */
export async function countActiveEmployees(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<number> {
  const { count } = await supabase
    .from("employees")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .is("deleted_at", null);

  return count ?? 0;
}

/**
 * Get the plan for a tenant.
 * Used for plan limit checks.
 */
export async function getTenantPlan(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<Plan | null> {
  const { data } = await supabase
    .from("tenants")
    .select("plan")
    .eq("id", tenantId)
    .single();

  return (data?.plan as Plan) ?? null;
}

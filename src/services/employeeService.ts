/**
 * Employee Service — Business logic for employee management.
 *
 * Handles:
 * - Invite new employee (plan limit, email uniqueness, auth user)
 * - Update employee (editable fields, JWT claims on role change)
 * - Deactivate employee (soft delete, auth user ban)
 * - List employees (active + deactivated)
 * - Plan limit status
 *
 * This file is in the Services layer. It imports from Repos and Types.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Employee } from "@/types/database";
import type { ApiResponse } from "@/types/api";
import { success, failure } from "@/types/api";
import { FREE_PLAN_EMPLOYEE_LIMIT } from "@/types/employee";
import {
  getEmployeesByTenant,
  getDeactivatedEmployees,
  getEmployeeById,
  getEmployeeByEmail,
  countActiveEmployees,
  getTenantPlan,
} from "@/repos/employeeRepo";
import { getNowIso } from "@/config/server/timestamps";

/**
 * Invite a new employee.
 * Checks plan limit, email uniqueness, creates auth user + employee record.
 */
export async function inviteEmployee(
  supabase: SupabaseClient,
  adminClient: SupabaseClient,
  tenantId: string,
  input: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    targetHoursWeek?: number;
    bundesland?: string | null;
  },
): Promise<ApiResponse<Employee>> {
  // 1. Check plan limit
  const plan = await getTenantPlan(adminClient, tenantId);
  if (plan === "free") {
    const count = await countActiveEmployees(adminClient, tenantId);
    if (count >= FREE_PLAN_EMPLOYEE_LIMIT) {
      return failure(
        `Maximal ${FREE_PLAN_EMPLOYEE_LIMIT} Mitarbeiter im kostenlosen Tarif. Jetzt upgraden.`,
      );
    }
  }

  // 2. Check email uniqueness within tenant
  const existing = await getEmployeeByEmail(adminClient, tenantId, input.email);
  if (existing) {
    return failure("Diese E-Mail existiert bereits in deinem Team");
  }

  // 3. Generate invitation token
  const invitationToken = crypto.randomUUID();

  // 4. Create Supabase Auth user via invite
  const { data: authData, error: authError } =
    await adminClient.auth.admin.inviteUserByEmail(input.email, {
      data: {
        tenant_id: tenantId,
        role: input.role,
      },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
    });

  if (authError && !authError.message.includes("already registered")) {
    console.error("Auth invite failed:", authError);
    return failure("Fehler beim Einladen des Mitarbeiters");
  }

  // 5. Insert employee record
  const userId = authData?.user?.id ?? "";
  const { data: employee, error: empError } = await adminClient
    .from("employees")
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      role: input.role,
      target_hours_week: input.targetHoursWeek ?? 40,
      bundesland: input.bundesland ?? null,
      invitation_token: invitationToken,
      invited_at: getNowIso(),
    })
    .select("*")
    .single();

  if (empError || !employee) {
    console.error("Employee insert failed:", empError);
    return failure("Fehler beim Anlegen des Mitarbeiters");
  }

  // 6. Set JWT claims (trigger handles this too, but call explicitly)
  if (userId) {
    await adminClient.rpc("set_employee_claims", {
      user_uuid: userId,
    });
  }

  return success(employee);
}

/**
 * Update an employee's editable fields.
 * Re-sets JWT claims if role changes.
 */
export async function updateEmployee(
  supabase: SupabaseClient,
  adminClient: SupabaseClient,
  tenantId: string,
  employeeId: string,
  updates: {
    first_name?: string;
    last_name?: string;
    role?: string;
    target_hours_week?: number;
    bundesland?: string | null;
  },
): Promise<ApiResponse<Employee>> {
  // 1. Verify employee exists in tenant
  const existing = await getEmployeeById(adminClient, tenantId, employeeId);
  if (!existing) {
    return failure("Mitarbeiter nicht gefunden");
  }

  // 2. Update employee record
  const { data: updated, error: updateError } = await adminClient
    .from("employees")
    .update(updates)
    .eq("id", employeeId)
    .eq("tenant_id", tenantId)
    .select("*")
    .single();

  if (updateError || !updated) {
    console.error("Employee update failed:", updateError);
    return failure("Fehler beim Aktualisieren des Mitarbeiters");
  }

  // 3. If role changed, re-set JWT claims
  if (updates.role && updates.role !== existing.role && existing.user_id) {
    await adminClient.rpc("set_employee_claims", {
      user_uuid: existing.user_id,
    });
  }

  return success(updated);
}

/**
 * Deactivate (soft-delete) an employee.
 * Bans the auth user to prevent login.
 */
export async function deactivateEmployee(
  supabase: SupabaseClient,
  adminClient: SupabaseClient,
  tenantId: string,
  employeeId: string,
  selfEmployeeId: string,
): Promise<ApiResponse<{ id: string }>> {
  // 1. Prevent self-deactivation
  if (employeeId === selfEmployeeId) {
    return failure("Du kannst dich nicht selbst deaktivieren");
  }

  // 2. Verify employee exists and is active
  const existing = await getEmployeeById(adminClient, tenantId, employeeId);
  if (!existing) {
    return failure("Mitarbeiter nicht gefunden");
  }

  if (existing.deleted_at) {
    return failure("Mitarbeiter ist bereits deaktiviert");
  }

  // 3. Soft-delete: set deleted_at
  const { error: deleteError } = await adminClient
    .from("employees")
    .update({ deleted_at: getNowIso() })
    .eq("id", employeeId)
    .eq("tenant_id", tenantId);

  if (deleteError) {
    console.error("Employee deactivation failed:", deleteError);
    return failure("Fehler beim Deaktivieren des Mitarbeiters");
  }

  // 4. Disable Supabase Auth user
  if (existing.user_id) {
    await adminClient.auth.admin.updateUserById(existing.user_id, {
      ban_duration: "876000h",
    });
  }

  return success({ id: employeeId });
}

/**
 * List all employees for a tenant (active + deactivated).
 */
export async function listEmployees(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<
  ApiResponse<{ active: Employee[]; deactivated: Employee[] }>
> {
  const [active, deactivated] = await Promise.all([
    getEmployeesByTenant(supabase, tenantId),
    getDeactivatedEmployees(supabase, tenantId),
  ]);

  return success({ active, deactivated });
}

/**
 * Get plan limit status for the tenant.
 */
export async function getPlanLimitStatus(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<
  ApiResponse<{
    plan: string | null;
    activeCount: number;
    limit: number | null;
    canAddMore: boolean;
  }>
> {
  const [plan, activeCount] = await Promise.all([
    getTenantPlan(supabase, tenantId),
    countActiveEmployees(supabase, tenantId),
  ]);

  const limit = plan === "free" ? FREE_PLAN_EMPLOYEE_LIMIT : null;
  const canAddMore = limit === null ? true : activeCount < limit;

  return success({ plan, activeCount, limit, canAddMore });
}

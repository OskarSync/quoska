/**
 * E2E helpers for Quoska tests.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

export const adminClient: SupabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

/** Generate a unique test email */
export function testEmail(prefix = "test"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@quoska.test`;
}

/** Test password that meets min 8 char requirement */
export const TEST_PASSWORD = "testpass123";

/** Clean up all test data for a given email */
export async function cleanupTestUser(email: string) {
  const { data: employees } = await adminClient
    .from("employees")
    .select("id, tenant_id")
    .eq("email", email);

  if (employees && employees.length > 0) {
    for (const emp of employees) {
      await adminClient.from("time_entry_audit").delete().eq("tenant_id", emp.tenant_id);
      await adminClient.from("correction_requests").delete().eq("tenant_id", emp.tenant_id);
      await adminClient.from("break_sessions").delete().eq("tenant_id", emp.tenant_id);
      await adminClient.from("time_entries").delete().eq("tenant_id", emp.tenant_id);
      await adminClient.from("notifications").delete().eq("employee_id", emp.id);
      await adminClient.from("leave_requests").delete().eq("employee_id", emp.id);
      await adminClient.from("leave_entitlements").delete().eq("employee_id", emp.id);
      await adminClient.from("sick_entries").delete().eq("employee_id", emp.id);
      await adminClient.from("project_assignments").delete().eq("employee_id", emp.id);
    }
    await adminClient.from("employees").delete().eq("email", email);

    const tenantIds = [...new Set(employees.map((e) => e.tenant_id))];
    for (const tid of tenantIds) {
      const { count } = await adminClient
        .from("employees")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tid);
      if (count === 0) {
        await adminClient.from("project_assignments").delete().eq("tenant_id", tid);
        await adminClient.from("projects").delete().eq("tenant_id", tid);
        await adminClient.from("subscription_events").delete().eq("tenant_id", tid);
        await adminClient.from("tenants").delete().eq("id", tid);
      }
    }
  }

  const { data: users } = await adminClient.auth.admin.listUsers();
  if (users) {
    const user = users.users.find((u) => u.email === email);
    if (user) {
      await adminClient.auth.admin.deleteUser(user.id);
    }
  }
}

/**
 * Create a fully set-up user with tenant, employee, and JWT claims.
 * This user can log in and see the dashboard.
 */
export async function createTestUser(opts: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName: string;
  role?: "admin" | "manager" | "employee";
  bundesland?: string;
  setupComplete?: boolean;
}) {
  const role = opts.role ?? "admin";
  const setupComplete = opts.setupComplete ?? true;

  // 1. Create auth user
  const { data: authData } = await adminClient.auth.admin.createUser({
    email: opts.email,
    password: opts.password,
    email_confirm: true,
  });
  const userId = authData.user?.id ?? "";
  if (!userId) throw new Error(`Failed to create auth user for ${opts.email}`);

  // 2. Create tenant
  const { data: tenant, error: tenantErr } = await adminClient
    .from("tenants")
    .insert({ name: opts.companyName, plan: "free", bundesland: opts.bundesland ?? null, setup_complete: setupComplete })
    .select("id")
    .single();
  if (tenantErr || !tenant) throw new Error(`Failed to create tenant: ${tenantErr?.message}`);

  // 3. Create employee (this triggers on_employee_created → sets JWT claims)
  const { error: empErr } = await adminClient
    .from("employees")
    .insert({
      tenant_id: tenant.id,
      user_id: userId,
      first_name: opts.firstName,
      last_name: opts.lastName,
      email: opts.email,
      role,
    });
  if (empErr) throw new Error(`Failed to create employee: ${empErr.message}`);

  // 4. Explicitly set JWT claims (belt-and-suspenders with the trigger)
  await adminClient.rpc("set_employee_claims", { user_uuid: userId });

  return { userId, tenantId: tenant.id };
}

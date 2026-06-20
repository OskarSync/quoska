/**
 * Shared fixtures for the Project Assignment Epic 11 E2E specs.
 *
 * Extracted so the suite can be split across multiple files (each <300 lines)
 * without duplicating the tenant/employee/project setup. Each spec file calls
 * setupProjectAssignmentEnv() in its own beforeAll, creating an isolated
 * tenant, two employees (Lukas, Sarah), and a pre-created project.
 *
 * `assignedEmployee` controls which employee the project is initially
 * assigned to (1 = Lukas, 2 = Sarah), so specs that rely on a specific
 * assignment state do not depend on cross-test mutation ordering.
 */

import { expect, type Page } from "@playwright/test";
import {
  testEmail,
  TEST_PASSWORD,
  cleanupTestUser,
  createTestUser,
  adminClient,
} from "./helpers";

/** The pre-created project. Tests must NOT rename or delete it. */
export const PROJECT_NAME = "Website Redesign";
export const PROJECT_CUSTOMER = "Bäckerei Müller";

export interface ProjectAssignmentEnv {
  adminEmail: string;
  employeeEmail: string;
  employee2Email: string;
  tenantId: string;
  employeeEmpId: string;
  employee2EmpId: string;
  projectId: string;
}

/** Log in as the given email and wait for the dashboard. */
export async function loginAs(page: Page, email: string): Promise<void> {
  await page.goto("/login");
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("E-Mail").fill(email);
  await page.getByLabel("Passwort").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: /anmelden/i }).click();
  await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
}

/**
 * Create an isolated tenant + 2 employees + a project.
 * The project is assigned to `assignedEmployee` (1 = Lukas, 2 = Sarah).
 */
export async function setupProjectAssignmentEnv(
  prefix: string,
  assignedEmployee: 1 | 2 = 1,
): Promise<ProjectAssignmentEnv> {
  const adminEmail = testEmail(`${prefix}-admin`);
  const employeeEmail = testEmail(`${prefix}-emp`);
  const employee2Email = testEmail(`${prefix}-emp2`);

  const admin = await createTestUser({
    email: adminEmail,
    password: TEST_PASSWORD,
    firstName: "Anna",
    lastName: "Admin",
    companyName: "Projekt Test GmbH",
    role: "admin",
    bundesland: "berlin",
  });
  const tenantId = admin.tenantId;

  for (const [email, first, last] of [
    [employeeEmail, "Lukas", "Mitarbeiter"],
    [employee2Email, "Sarah", "Kollegin"],
  ] as const) {
    const { data: auth } = await adminClient.auth.admin.createUser({
      email,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    await adminClient.from("employees").insert({
      tenant_id: tenantId,
      user_id: auth.user!.id,
      first_name: first,
      last_name: last,
      email,
      role: "employee",
    });
    await adminClient.rpc("set_employee_claims", { user_uuid: auth.user!.id });
  }

  const { data: emp1 } = await adminClient
    .from("employees")
    .select("id")
    .eq("email", employeeEmail)
    .single();
  const { data: emp2 } = await adminClient
    .from("employees")
    .select("id")
    .eq("email", employee2Email)
    .single();

  const { data: project } = await adminClient
    .from("projects")
    .insert({
      tenant_id: tenantId,
      name: PROJECT_NAME,
      customer_name: PROJECT_CUSTOMER,
      color: "#6366f1",
    })
    .select("id")
    .single();

  const assignedId = assignedEmployee === 1 ? emp1!.id : emp2!.id;
  await adminClient.from("project_assignments").insert({
    tenant_id: tenantId,
    project_id: project!.id,
    employee_id: assignedId,
  });

  return {
    adminEmail,
    employeeEmail,
    employee2Email,
    tenantId,
    employeeEmpId: emp1!.id,
    employee2EmpId: emp2!.id,
    projectId: project!.id,
  };
}

/** Tear down everything created by setupProjectAssignmentEnv. */
export async function teardownProjectAssignmentEnv(
  env: ProjectAssignmentEnv,
): Promise<void> {
  await adminClient.from("time_entries").delete().eq("tenant_id", env.tenantId);
  await adminClient.from("project_assignments").delete().eq("tenant_id", env.tenantId);
  await adminClient.from("projects").delete().eq("tenant_id", env.tenantId);
  await cleanupTestUser(env.adminEmail);
  await cleanupTestUser(env.employeeEmail);
  await cleanupTestUser(env.employee2Email);
}

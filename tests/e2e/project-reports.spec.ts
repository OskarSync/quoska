/**
 * Epic 11: Project Reports — E2E
 *
 * Split out of project-assignment.spec.ts to keep files under the 300-line
 * limit (NFR-8). These tests verify the Projekte tab on the reports page:
 * project hours, the "Ohne Projekt" bucket, and week navigation.
 *
 * Shared setup lives in project-assignment-fixtures.ts.
 */

import { test, expect, type Page } from "@playwright/test";
import { adminClient } from "./helpers";
import {
  setupProjectAssignmentEnv,
  teardownProjectAssignmentEnv,
  loginAs,
  PROJECT_NAME,
  type ProjectAssignmentEnv,
} from "./project-assignment-fixtures";

test.describe("Project Reports — Epic 11", () => {
  let env: ProjectAssignmentEnv;
  // Describe-scope aliases so test bodies reference them verbatim.
  let tenantId: string;
  let employeeEmpId: string;
  let employee2EmpId: string;
  let projectId: string;

  const loginAsAdmin = (page: Page) => loginAs(page, env.adminEmail);

  test.beforeAll(async () => {
    env = await setupProjectAssignmentEnv("pr", 1);
    tenantId = env.tenantId;
    employeeEmpId = env.employeeEmpId;
    employee2EmpId = env.employee2EmpId;
    projectId = env.projectId;
  });

  test.afterAll(async () => {
    await teardownProjectAssignmentEnv(env);
  });

  test("reports page has Projekte tab", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/app/reports");
    await expect(page.getByRole("tab", { name: /projekte/i })).toBeVisible({ timeout: 5_000 });
  });

  test("project report shows project with hours", async ({ page }) => {
    // Ensure a completed time entry exists with this project
    const { data: existing } = await adminClient
      .from("time_entries")
      .select("id")
      .eq("employee_id", employeeEmpId)
      .eq("project_id", projectId)
      .eq("status", "completed");

    if (!existing || existing.length === 0) {
      const today = new Date().toISOString().split("T")[0];
      const h = (offset: number) =>
        new Date(Date.now() - offset * 3600_000).toISOString().replace("T", " ");

      await adminClient.from("time_entries").insert({
        tenant_id: tenantId,
        employee_id: employeeEmpId,
        date: today,
        clock_in: h(4),
        clock_out: h(0),
        break_minutes: 30,
        status: "completed",
        project_id: projectId,
      });
    }

    await loginAsAdmin(page);
    await page.goto("/app/reports");
    await page.getByRole("tab", { name: /projekte/i }).click();

    await expect(page.getByText(PROJECT_NAME).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/stunden/i).first()).toBeVisible();
  });

  test("project report shows Ohne Projekt for unassigned entries", async ({ page }) => {
    // Ensure an entry without project exists
    const { data: unassigned } = await adminClient
      .from("time_entries")
      .select("id")
      .eq("employee_id", employee2EmpId)
      .is("project_id", null)
      .eq("status", "completed");

    if (!unassigned || unassigned.length === 0) {
      const today = new Date().toISOString().split("T")[0];
      const h = (offset: number) =>
        new Date(Date.now() - offset * 3600_000).toISOString().replace("T", " ");

      await adminClient.from("time_entries").insert({
        tenant_id: tenantId,
        employee_id: employee2EmpId,
        date: today,
        clock_in: h(2),
        clock_out: h(1),
        break_minutes: 0,
        status: "completed",
        project_id: null,
      });
    }

    await loginAsAdmin(page);
    await page.goto("/app/reports");
    await page.getByRole("tab", { name: /projekte/i }).click();

    await expect(page.getByText(/ohne projekt/i)).toBeVisible({ timeout: 10_000 });
  });

  test("project report has week navigation", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/app/reports");
    await page.getByRole("tab", { name: /projekte/i }).click();

    await expect(page.getByText(/diese woche/i)).toBeVisible({ timeout: 5_000 });
  });
});

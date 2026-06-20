/**
 * Epic 11: Project & Customer Assignment — E2E (CRUD, Assignment, Clock-in)
 *
 * Comprehensive tests covering:
 * - CRUD flows via UI (create, edit, deactivate)
 * - Edge cases (empty fields, validation errors)
 * - Employee assignment
 * - Clock-in/out with project
 * - Role-based access
 * - Empty state
 *
 * Reports-specific tests live in project-reports.spec.ts.
 * Shared setup lives in project-assignment-fixtures.ts.
 */

import { test, expect, type Page } from "@playwright/test";
import {
  testEmail,
  TEST_PASSWORD,
  cleanupTestUser,
  createTestUser,
  adminClient,
} from "./helpers";
import {
  setupProjectAssignmentEnv,
  teardownProjectAssignmentEnv,
  loginAs,
  PROJECT_NAME,
  PROJECT_CUSTOMER,
  type ProjectAssignmentEnv,
} from "./project-assignment-fixtures";

test.describe("Project Assignment — Epic 11", () => {
  let env: ProjectAssignmentEnv;
  // Describe-scope aliases so test bodies can reference them verbatim.
  let tenantId: string;
  let employee2EmpId: string;
  let projectId: string;

  const loginAsAdmin = (page: Page) => loginAs(page, env.adminEmail);
  const loginAsEmployee = (page: Page) => loginAs(page, env.employeeEmail);
  const loginAsEmployee2 = (page: Page) => loginAs(page, env.employee2Email);

  test.beforeAll(async () => {
    env = await setupProjectAssignmentEnv("pa", 1);
    tenantId = env.tenantId;
    employee2EmpId = env.employee2EmpId;
    projectId = env.projectId;
  });

  test.afterAll(async () => {
    await teardownProjectAssignmentEnv(env);
  });

  // =========================================================================
  // Navigation & Access
  // =========================================================================

  test("Projekte link visible in sidebar for admin", async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.getByRole("link", { name: /projekte/i }).first()).toBeVisible({ timeout: 5_000 });
  });

  test("employee does NOT see Projekte in sidebar", async ({ page }) => {
    await loginAsEmployee(page);
    await expect(page.getByRole("link", { name: /projekte/i })).not.toBeVisible();
  });

  test("projects page loads with heading", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/app/projects");
    await expect(page.getByRole("heading", { name: /projekte/i })).toBeVisible({ timeout: 5_000 });
  });

  test("pre-created project appears in list", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/app/projects");
    await expect(page.getByText(PROJECT_NAME)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(PROJECT_CUSTOMER)).toBeVisible();
    await expect(page.getByText("1 Mitarbeiter")).toBeVisible();
  });

  // =========================================================================
  // Create via UI
  // =========================================================================

  test("can create a project with name and customer via form", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/app/projects");

    await page
      .getByRole("button", { name: /projekt hinzufügen/i })
      .first()
      .click();
    await expect(page.getByRole("heading", { name: /neues projekt/i })).toBeVisible({ timeout: 5_000 });

    await page.getByLabel("Name").fill("App Redesign");
    await page.getByLabel("Kunde").fill("Kunde A");

    const dialog = page.getByRole("dialog");
    const colorBtns = dialog.locator("button[style*=background]");
    if ((await colorBtns.count()) > 0) await colorBtns.nth(3).click();

    await page.getByRole("button", { name: /erstellen/i }).click();

    await expect(page.getByText("App Redesign")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Kunde A")).toBeVisible();
  });

  test("can create a project with only a name", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/app/projects");

    await page
      .getByRole("button", { name: /projekt hinzufügen/i })
      .first()
      .click();
    await expect(page.getByRole("heading", { name: /neues projekt/i })).toBeVisible({ timeout: 5_000 });

    await page.getByLabel("Name").fill("Minimal Project");
    await page.getByRole("button", { name: /erstellen/i }).click();

    await expect(page.getByText("Minimal Project")).toBeVisible({ timeout: 5_000 });
  });

  test("cannot create a project with empty name — shows validation error", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/app/projects");

    await page
      .getByRole("button", { name: /projekt hinzufügen/i })
      .first()
      .click();
    await expect(page.getByRole("heading", { name: /neues projekt/i })).toBeVisible({ timeout: 5_000 });

    // Clear name if there's a default, then try to submit
    await page.getByLabel("Name").clear();
    await page.getByRole("button", { name: /erstellen/i }).click();

    await expect(page.getByText(/name ist erforderlich/i)).toBeVisible({ timeout: 5_000 });
    await page.keyboard.press("Escape");
  });

  // =========================================================================
  // Edit via UI
  // =========================================================================

  test("can edit a project — form pre-fills and saves", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/app/projects");

    await expect(page.getByText(PROJECT_NAME)).toBeVisible({ timeout: 5_000 });

    const card = page
      .locator('[data-slot="card-content"]')
      .filter({ hasText: PROJECT_NAME });
    await card.getByTitle("Bearbeiten").click();

    await expect(page.getByRole("heading", { name: /projekt bearbeiten/i })).toBeVisible({ timeout: 5_000 });

    // Form should be pre-filled with existing data
    await expect(page.getByLabel("Name")).toHaveValue(PROJECT_NAME, { timeout: 5_000 });
    await expect(page.getByLabel("Kunde")).toHaveValue(PROJECT_CUSTOMER);

    // Edit customer only (keep name the same so other tests don't break)
    await page.getByLabel("Kunde").clear();
    await page.getByLabel("Kunde").fill("Müller GmbH");

    await page.getByRole("button", { name: /speichern/i }).click();

    // Should show updated customer
    await expect(page.getByText("Müller GmbH")).toBeVisible({ timeout: 5_000 });
  });

  // =========================================================================
  // Assign employees
  // =========================================================================

  test("assignment panel shows currently-assigned employees as checked", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto("/app/projects");

    await expect(page.getByText(PROJECT_NAME)).toBeVisible({ timeout: 5_000 });

    const card = page
      .locator('[data-slot="card-content"]')
      .filter({ hasText: PROJECT_NAME });

    // Open assign panel (uses Users icon now)
    await card.getByTitle("Mitarbeiter zuordnen").click();

    await expect(
      page.getByText(/mitarbeiter zuordnen:/i),
    ).toBeVisible({ timeout: 5_000 });

    // Lukas is assigned in beforeAll — should be pre-checked
    const lukasLabel = page.locator("label", { hasText: /Lukas/i });
    await expect(lukasLabel.locator('input[type="checkbox"]')).toBeChecked({
      timeout: 5_000,
    });

    // Sarah is NOT assigned — should be unchecked
    const sarahLabel = page.locator("label", { hasText: /Sarah/i });
    await expect(sarahLabel.locator('input[type="checkbox"]')).not.toBeChecked();

    // No changes yet — button disabled
    await expect(
      page.getByRole("button", { name: /änderungen speichern/i }),
    ).toBeDisabled();
  });

  test("can assign a new employee and unassign an existing one", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto("/app/projects");

    await expect(page.getByText(PROJECT_NAME)).toBeVisible({ timeout: 5_000 });

    const card = page
      .locator('[data-slot="card-content"]')
      .filter({ hasText: PROJECT_NAME });
    await card.getByTitle("Mitarbeiter zuordnen").click();

    await expect(
      page.getByText(/mitarbeiter zuordnen:/i),
    ).toBeVisible({ timeout: 5_000 });

    // Wait for assignments to load
    await expect(
      page.locator("label", { hasText: /Lukas/i }).locator('input[type="checkbox"]'),
    ).toBeChecked({ timeout: 5_000 });

    // Check Sarah (assign new)
    const sarahLabel = page.locator("label", { hasText: /Sarah/i });
    await sarahLabel.locator('input[type="checkbox"]').check();

    // Uncheck Lukas (remove existing)
    const lukasLabel = page.locator("label", { hasText: /Lukas/i });
    await lukasLabel.locator('input[type="checkbox"]').uncheck();

    // Save
    await page
      .getByRole("button", { name: /änderungen speichern/i })
      .click();

    // Employee count should still be 1 (replaced Lukas with Sarah)
    await expect(card.getByText("1 Mitarbeiter")).toBeVisible({ timeout: 5_000 });

    // Reload page to get clean state for verification
    await page.reload();
    await expect(page.getByText(PROJECT_NAME)).toBeVisible({ timeout: 5_000 });

    // Open panel to verify state persisted
    const cardAfterSave = page
      .locator('[data-slot="card-content"]')
      .filter({ hasText: PROJECT_NAME });
    await cardAfterSave.getByTitle("Mitarbeiter zuordnen").click();
    await expect(
      cardAfterSave.getByText(/mitarbeiter zuordnen:/i),
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      cardAfterSave.locator("label", { hasText: /Sarah/i }).locator('input[type="checkbox"]'),
    ).toBeChecked({ timeout: 5_000 });
    await expect(
      cardAfterSave.locator("label", { hasText: /Lukas/i }).locator('input[type="checkbox"]'),
    ).not.toBeChecked();
  });

  // =========================================================================
  // Deactivate
  // =========================================================================

  test("can soft-delete a project — it disappears from list", async ({ page }) => {
    const { data: throwaway } = await adminClient
      .from("projects")
      .insert({ tenant_id: tenantId, name: "Throwaway", color: "#ef4444" })
      .select("id")
      .single();

    await loginAsAdmin(page);
    await page.goto("/app/projects");

    await expect(page.getByText("Throwaway")).toBeVisible({ timeout: 5_000 });

    const card = page
      .locator('[data-slot="card-content"]')
      .filter({ hasText: "Throwaway" });
    await card.getByTitle("Löschen").first().click();

    // Should disappear from list (soft delete)
    await expect(page.getByText("Throwaway")).not.toBeVisible({ timeout: 5_000 });

    // Cleanup
    await adminClient.from("projects").delete().eq("id", throwaway!.id);
  });

  test("inactive project (active=false) shows when toggling Inaktive anzeigen", async ({
    page,
  }) => {
    // Create project then deactivate it (set active=false, NOT soft delete)
    const { data: inactive } = await adminClient
      .from("projects")
      .insert({ tenant_id: tenantId, name: "Inactive Project", color: "#22c55e", active: false })
      .select("id")
      .single();

    await loginAsAdmin(page);
    await page.goto("/app/projects");

    // Should NOT be visible in active list
    await expect(page.getByText("Inactive Project")).not.toBeVisible({ timeout: 5_000 });

    // Toggle "Inaktive anzeigen"
    await page.locator('input[type="checkbox"]').check();
    await expect(page.getByText("Inactive Project")).toBeVisible({ timeout: 5_000 });

    // Cleanup
    await adminClient.from("projects").delete().eq("id", inactive!.id);
  });

  // =========================================================================
  // Clock-in with Project
  // =========================================================================

  test("employee sees project selector when assigned", async ({ page }) => {
    // Test 10 reassigned project from Lukas to Sarah, so use Sarah
    await loginAsEmployee2(page);
    await page.goto("/app/clock");

    await expect(page.locator('[data-slot="select-trigger"]')).toBeVisible({ timeout: 10_000 });
  });

  test("employee can clock in with a project and clock out", async ({ page }) => {
    await adminClient
      .from("time_entries")
      .delete()
      .eq("employee_id", employee2EmpId)
      .eq("status", "running");

    // Use employee2 (Sarah) who was assigned in test 10
    await loginAsEmployee2(page);
    await page.goto("/app/clock");

    // Select project
    await page.locator('[data-slot="select-trigger"]').click();
    await page.getByRole("option", { name: new RegExp(PROJECT_NAME, "i") }).click();

    // Clock in — success is reflected by the button switching to "Ausstempeln"
    await page.getByRole("button", { name: /^stempeln$/i }).click();
    await expect(page.getByRole("button", { name: /ausstempeln/i })).toBeVisible({ timeout: 10_000 });

    // Clock out
    await page.getByRole("button", { name: /ausstempeln/i }).click();
    await expect(
      page.getByRole("button", { name: /^stempeln$/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("time entry has project_id set in database", async () => {
    const { data: entries } = await adminClient
      .from("time_entries")
      .select("id, project_id")
      .eq("employee_id", employee2EmpId)
      .order("created_at", { ascending: false })
      .limit(1);

    expect(entries).toBeDefined();
    expect(entries!.length).toBeGreaterThanOrEqual(1);
    expect(entries![0].project_id).toBe(projectId);
  });

  // =========================================================================
  // Empty state
  // =========================================================================

  test("new tenant sees empty state on projects page", async ({ page }) => {
    const freshEmail = testEmail("fresh-admin");
    await createTestUser({
      email: freshEmail,
      password: TEST_PASSWORD,
      firstName: "Fresh",
      lastName: "Admin",
      companyName: "Empty Co",
      role: "admin",
      bundesland: "berlin",
    });

    await page.goto("/login");
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(freshEmail);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    await page.goto("/app/projects");
    await expect(page.getByText(/keine projekte/i)).toBeVisible({ timeout: 5_000 });

    await cleanupTestUser(freshEmail);
  });
});

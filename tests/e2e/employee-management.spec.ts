/**
 * Story 3.1: Employee Management — Add, Edit & Invite (E2E)
 */

import { test, expect } from "@playwright/test";
import {
  testEmail, TEST_PASSWORD, cleanupTestUser, createTestUser, adminClient,
} from "./helpers";

test.describe("Employee Invite & Edit — Story 3.1", () => {
  const adminEmail = testEmail("emp-admin");

  test.beforeAll(async () => {
    await createTestUser({
      email: adminEmail, password: TEST_PASSWORD,
      firstName: "Admin", lastName: "User",
      companyName: "Employee Test GmbH", role: "admin",
    });
  });

  test.afterAll(async () => {
    await cleanupTestUser(adminEmail);
  });

  async function goToEmployees(page: import("@playwright/test").Page) {
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(adminEmail);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
    await page.goto("/app/employees");
    await expect(
      page.getByRole("heading", { name: /mitarbeiter/i }),
    ).toBeVisible({ timeout: 5_000 });
  }

  test("employees page loads with correct German text", async ({ page }) => {
    await goToEmployees(page);
    await expect(
      page.getByRole("heading", { name: /mitarbeiter/i }),
    ).toBeVisible();
    await expect(page.getByText("Verwalte dein Team")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /hinzufügen/i }),
    ).toBeVisible();
  });

  test("can invite a new employee via dialog", async ({ page }) => {
    const newEmail = testEmail("invite-e2e");
    await goToEmployees(page);

    await page.getByRole("button", { name: /hinzufügen/i }).click();
    await expect(
      page.getByRole("heading", { name: /mitarbeiter hinzufügen/i }),
    ).toBeVisible();

    await page.getByLabel("Vorname").fill("Max");
    await page.getByLabel("Nachname").fill("Mustermann");
    await page.getByLabel("E-Mail").fill(newEmail);
    await page.getByRole("button", { name: /einladen/i }).click();

    await expect(page.getByText("Max Mustermann")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(newEmail)).toBeVisible();

    await cleanupTestUser(newEmail);
  });

  test("can edit an employee's details", async ({ page }) => {
    const editEmail = testEmail("edit-e2e");

    // Get admin's tenant so we create the employee in the same tenant
    const { data: adminEmp } = await adminClient
      .from("employees")
      .select("tenant_id")
      .eq("email", adminEmail)
      .single();
    const tenantId = adminEmp!.tenant_id;

    const { data: authData } = await adminClient.auth.admin.createUser({
      email: editEmail, password: TEST_PASSWORD, email_confirm: true,
    });
    const userId = authData.user?.id ?? "";
    await adminClient.from("employees").insert({
      tenant_id: tenantId, user_id: userId,
      first_name: "Edita", last_name: "Before",
      email: editEmail, role: "employee",
    });
    await adminClient.rpc("set_employee_claims", { user_uuid: userId });

    await goToEmployees(page);

    const row = page.locator("div.rounded-lg.border > div").filter({ hasText: editEmail });
    await expect(row).toBeVisible({ timeout: 5_000 });
    await row.getByRole("button", { name: /bearbeiten/i }).click();

    await expect(
      page.getByRole("heading", { name: /mitarbeiter bearbeiten/i }),
    ).toBeVisible();

    const firstNameInput = page.getByLabel("Vorname");
    await firstNameInput.clear();
    await firstNameInput.fill("Edita-Updated");
    await page.getByRole("button", { name: /speichern/i }).click();

    await expect(page.getByText("Edita-Updated")).toBeVisible({
      timeout: 10_000,
    });

    await cleanupTestUser(editEmail);
  });

  test("shows aktive Mitarbeiter count", async ({ page }) => {
    await goToEmployees(page);
    await expect(page.getByText(/aktive Mitarbeiter/i)).toBeVisible();
  });

  test("invite dialog stays open with empty fields", async ({ page }) => {
    await goToEmployees(page);
    await page.getByRole("button", { name: /hinzufügen/i }).click();
    await page.getByRole("button", { name: /einladen/i }).click();

    // Dialog should still be open (browser required validation)
    await expect(
      page.getByRole("heading", { name: /mitarbeiter hinzufügen/i }),
    ).toBeVisible();

    await page.getByRole("button", { name: /abbrechen/i }).click();
  });

  test("employee role cannot see Mitarbeiter in sidebar", async ({ page }) => {
    const empEmail = testEmail("role-emp");
    await createTestUser({
      email: empEmail, password: TEST_PASSWORD,
      firstName: "Regular", lastName: "Employee",
      companyName: "Role Test GmbH", role: "employee",
    });

    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(empEmail);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    await expect(
      page.getByRole("link", { name: /mitarbeiter/i }),
    ).not.toBeVisible();

    await cleanupTestUser(empEmail);
  });
});

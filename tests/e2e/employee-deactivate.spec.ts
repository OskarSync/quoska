/**
 * Story 3.2: Employee Deactivation & Plan Limit Enforcement (E2E)
 */

import { test, expect } from "@playwright/test";
import {
  testEmail, TEST_PASSWORD, cleanupTestUser, createTestUser, adminClient,
} from "./helpers";

test.describe("Employee Deactivation — Story 3.2", () => {
  const adminEmail = testEmail("deact-admin");

  test.beforeAll(async () => {
    await createTestUser({
      email: adminEmail, password: TEST_PASSWORD,
      firstName: "Deact", lastName: "Admin",
      companyName: "Deact Test GmbH", role: "admin",
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

  /** Helper: create a test employee under the admin's tenant */
  async function createTestEmployee(email: string, opts?: { deletedAt?: string }) {
    const { data: adminEmp } = await adminClient
      .from("employees").select("tenant_id").eq("email", adminEmail).single();
    const tenantId = adminEmp!.tenant_id;

    const { data: authData } = await adminClient.auth.admin.createUser({
      email, password: TEST_PASSWORD, email_confirm: true,
    });
    const userId = authData.user?.id ?? "";

    await adminClient.from("employees").insert({
      tenant_id: tenantId, user_id: userId,
      first_name: "Test", last_name: "Employee",
      email, role: "employee",
      ...(opts?.deletedAt ? { deleted_at: opts.deletedAt } : {}),
    });

    if (!opts?.deletedAt) {
      await adminClient.rpc("set_employee_claims", { user_uuid: userId });
    }

    return { tenantId, userId };
  }

  test("can deactivate an employee", async ({ page }) => {
    const deactEmail = testEmail("deact-emp");
    await createTestEmployee(deactEmail);

    await goToEmployees(page);

    // Find the specific row and click its deactivate button
    const row = page.locator("div.rounded-lg.border > div").filter({ hasText: deactEmail });
    await expect(row).toBeVisible({ timeout: 5_000 });

    page.on("dialog", (dialog) => dialog.accept());
    await row.getByRole("button", { name: /deaktivieren/i }).click();

    // Employee should disappear from active list
    await expect(row).not.toBeVisible({ timeout: 5_000 });

    await cleanupTestUser(deactEmail);
  });

  test("deactivated employees appear in collapsible section", async ({
    page,
  }) => {
    const deactEmail = testEmail("deact-show");
    await createTestEmployee(deactEmail, { deletedAt: "2026-06-01T00:00:00Z" });

    await goToEmployees(page);

    // Should see the deactivated section (collapsed)
    await expect(
      page.getByText(/deaktivierte mitarbeiter/i),
    ).toBeVisible({ timeout: 5_000 });

    // Click to expand
    await page.getByText(/deaktivierte mitarbeiter/i).click();

    // Should now see the deactivated employee
    await expect(page.getByText(deactEmail)).toBeVisible({ timeout: 5_000 });

    await cleanupTestUser(deactEmail);
  });
});

test.describe("Plan Limit Enforcement — Story 3.2", () => {
  test("free plan enforces 3 employee limit", async ({ page }) => {
    const adminEmail = testEmail("plan-admin");
    await createTestUser({
      email: adminEmail, password: TEST_PASSWORD,
      firstName: "Plan", lastName: "Admin",
      companyName: "Plan Limit GmbH", role: "admin",
    });

    const { data: adminEmp } = await adminClient
      .from("employees").select("tenant_id").eq("email", adminEmail).single();
    const tenantId = adminEmp!.tenant_id;

    // Add 2 more employees (admin = 1, total = 3 = at limit)
    for (let i = 1; i <= 2; i++) {
      const email = testEmail(`plan-emp-${i}`);
      const { data: authData } = await adminClient.auth.admin.createUser({
        email, password: TEST_PASSWORD, email_confirm: true,
      });
      await adminClient.from("employees").insert({
        tenant_id: tenantId, user_id: authData.user?.id ?? "",
        first_name: `Emp${i}`, last_name: "Test", email, role: "employee",
      });
    }

    // Log in and go to employees page
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(adminEmail);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
    await page.goto("/app/employees");

    // The "Hinzufügen" button should be hidden when at plan limit
    // Instead, the page shows a plan limit message
    await expect(
      page.getByText(/max\.? 3 mitarbeiter im kostenlosen tarif/i),
    ).toBeVisible({ timeout: 10_000 });

    // Verify the Hinzufügen button is NOT present
    await expect(
      page.getByRole("button", { name: /hinzufügen/i }),
    ).not.toBeVisible();

    // Also verify via API that a 4th employee is rejected
    const res = await page.request.post("/api/v1/employees", {
      headers: { "Content-Type": "application/json" },
      data: {
        firstName: "Fourth",
        lastName: "Employee",
        email: testEmail("plan-fourth"),
        role: "employee",
      },
    });
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/maximal 3/i);

    // Cleanup
    const { data: emps } = await adminClient
      .from("employees").select("id, email, user_id").eq("tenant_id", tenantId);
    if (emps) {
      for (const e of emps) {
        await adminClient.from("employees").delete().eq("id", e.id);
        if (e.user_id) await adminClient.auth.admin.deleteUser(e.user_id);
      }
    }
    await adminClient.from("tenants").delete().eq("id", tenantId);
  });
});

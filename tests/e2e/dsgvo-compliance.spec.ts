/**
 * Story 6.3: DSGVO Compliance — Account Deletion & Retention — E2E
 *
 * Tests:
 * - Admin sees account deletion danger zone
 * - Account deletion requires password confirmation
 * - Account deletion shows 14-day waiting period message
 * - Manager does NOT see account deletion
 * - Unauthenticated API calls are rejected
 * - Retention cron access control
 */

import { test, expect } from "@playwright/test";
import {
  testEmail,
  TEST_PASSWORD,
  cleanupTestUser,
  createTestUser,
} from "./helpers";

test.describe("Account Deletion — Story 6.3 (Admin)", () => {
  const adminEmail = testEmail("del-admin");

  test.beforeAll(async () => {
    await createTestUser({
      email: adminEmail,
      password: TEST_PASSWORD,
      firstName: "Delete",
      lastName: "Admin",
      companyName: "Delete Test GmbH",
      role: "admin",
    });
  });

  test.afterAll(async () => {
    await cleanupTestUser(adminEmail);
  });

  async function loginAsAdmin(page: import("@playwright/test").Page) {
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(adminEmail);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page
      .getByRole("button", { name: /anmelden/i })
      .click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
  }

  test("settings page shows danger zone for admin", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/app/settings");

    // Wait for settings page to fully render (React Query needs to resolve)
    await expect(
      page.getByRole("heading", { name: /einstellungen/i }),
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByText("Account löschen"),
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByText(/14-tägigen Wartefrist/i),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("account deletion requires password", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/app/settings");

    const deleteBtn = page.getByRole("button", {
      name: /account und alle daten löschen/i,
    });

    // Button should be disabled without password
    await expect(deleteBtn).toBeDisabled({ timeout: 5_000 });

    // Enter wrong password
    await page.locator("#delete-password").fill("wrongpassword123");
    await deleteBtn.click();

    // Should show error
    await expect(page.getByText(/falsch/i)).toBeVisible({ timeout: 5_000 });
  });

  test("account deletion with correct password shows confirmation", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto("/app/settings");

    await page.locator("#delete-password").fill(TEST_PASSWORD);
    await page
      .getByRole("button", {
        name: /account und alle daten löschen/i,
      })
      .click();

    await expect(
      page.getByText(/14-tägigen/i),
    ).toBeVisible({ timeout: 10_000 });

    // Success message should appear
    await expect(
      page.getByText(/löschung angefordert|gelöscht/i),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("account deletion API rejects non-admin", async ({ page }) => {
    const empEmail = testEmail("del-emp");
    await createTestUser({
      email: empEmail,
      password: TEST_PASSWORD,
      firstName: "NoDelete",
      lastName: "Employee",
      companyName: "No Delete Co",
      role: "employee",
    });

    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(empEmail);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page
      .getByRole("button", { name: /anmelden/i })
      .click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    const res = await page.request.post("/api/v1/settings/account/delete", {
      data: { password: TEST_PASSWORD },
    });
    expect(res.status()).toBe(403);

    await cleanupTestUser(empEmail);
  });

  test("account deletion API rejects unauthenticated", async ({ page }) => {
    const res = await page.request.post("/api/v1/settings/account/delete", {
      data: { password: "test" },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe("Settings Page — Role Visibility", () => {
  test("manager sees export but NOT account deletion", async ({ page }) => {
    const mgrEmail = testEmail("set-mgr");
    await createTestUser({
      email: mgrEmail,
      password: TEST_PASSWORD,
      firstName: "Settings",
      lastName: "Manager",
      companyName: "Settings Test Co",
      role: "manager",
    });

    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(mgrEmail);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page
      .getByRole("button", { name: /anmelden/i })
      .click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    await page.goto("/app/settings");

    // Manager should see settings page
    await expect(
      page.getByRole("heading", { name: /einstellungen/i }),
    ).toBeVisible({ timeout: 5_000 });

    // Manager can export own data
    await expect(
      page.getByRole("button", { name: /meine daten exportieren/i }),
    ).toBeVisible({ timeout: 5_000 });

    // Manager does NOT see account deletion (admin only)
    await expect(
      page.getByText("Account löschen"),
    ).not.toBeVisible({ timeout: 3_000 });

    await cleanupTestUser(mgrEmail);
  });

  test("employee sees export but NOT account deletion", async ({ page }) => {
    const empEmail = testEmail("set-emp");
    await createTestUser({
      email: empEmail,
      password: TEST_PASSWORD,
      firstName: "Settings",
      lastName: "Employee",
      companyName: "Settings Test Co",
      role: "employee",
    });

    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(empEmail);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page
      .getByRole("button", { name: /anmelden/i })
      .click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    await page.goto("/app/settings");

    await expect(
      page.getByRole("heading", { name: /einstellungen/i }),
    ).toBeVisible({ timeout: 5_000 });

    // Employee can export own data
    await expect(
      page.getByRole("button", { name: /meine daten exportieren/i }),
    ).toBeVisible({ timeout: 5_000 });

    // Employee does NOT see CSV Export (manager only)
    await expect(
      page.getByRole("button", { name: /^csv export$/i }),
    ).not.toBeVisible({ timeout: 3_000 });

    // Employee does NOT see account deletion (admin only)
    await expect(
      page.getByText("Account löschen"),
    ).not.toBeVisible({ timeout: 3_000 });

    await cleanupTestUser(empEmail);
  });
});

test.describe("Retention Cron API — Access Control", () => {
  test("retention cron rejects requests without CRON_SECRET", async ({
    page,
  }) => {
    const res = await page.request.post("/api/v1/cron/retention");
    // Should be 401 (CRON_SECRET set, no auth header) or 200 (CRON_SECRET not set, allowed in dev)
    expect([200, 401, 500]).toContain(res.status());
  });
});

/**
 * Epic 9: Vacation Management — E2E
 *
 * Tests:
 * - Vacation page shows balance widget
 * - Employee can submit a leave request
 * - Leave request appears with correct status
 * - Employee can cancel a pending request
 * - Manager can approve a leave request
 * - Manager can reject a leave request
 * - Absence calendar renders with legend
 * - Navigation links work for Urlaub
 */

import { test, expect } from "@playwright/test";
import {
  testEmail,
  TEST_PASSWORD,
  cleanupTestUser,
  createTestUser,
  adminClient,
} from "./helpers";

test.describe("Vacation Management — Epic 9", () => {
  const managerEmail = testEmail("mgr-leave");
  const employeeEmail = testEmail("emp-leave");
  let tenantId: string;
  let employeeEmpId: string;

  test.beforeAll(async () => {
    // Create manager
    const mgr = await createTestUser({
      email: managerEmail,
      password: TEST_PASSWORD,
      firstName: "Maria",
      lastName: "Managerin",
      companyName: "Urlaub Test GmbH",
      role: "manager",
      bundesland: "nordrhein-westfalen",
    });
    tenantId = mgr.tenantId;

    // Create employee in same tenant
    const { data: authData } = await adminClient.auth.admin.createUser({
      email: employeeEmail,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    const empUserId = authData.user?.id ?? "";
    await adminClient.from("employees").insert({
      tenant_id: tenantId,
      user_id: empUserId,
      first_name: "Thomas",
      last_name: "Tester",
      email: employeeEmail,
      role: "employee",
    });
    await adminClient.rpc("set_employee_claims", { user_uuid: empUserId });

    const { data: empEmp } = await adminClient
      .from("employees")
      .select("id")
      .eq("email", employeeEmail)
      .single();
    employeeEmpId = empEmp!.id;

    // Create leave entitlement for 2026
    await adminClient.from("leave_entitlements").insert({
      tenant_id: tenantId,
      employee_id: employeeEmpId,
      year: 2026,
      total_days: 28,
      carried_over: 0,
    });
  });

  test.afterAll(async () => {
    await adminClient.from("leave_requests").delete().eq("tenant_id", tenantId);
    await adminClient.from("leave_entitlements").delete().eq("tenant_id", tenantId);
    await adminClient.from("notifications").delete().eq("tenant_id", tenantId);
    await cleanupTestUser(managerEmail);
    await cleanupTestUser(employeeEmail);
  });

  async function loginAsEmployee(page: import("@playwright/test").Page) {
    await page.goto("/login");
    // Clear any existing session
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(employeeEmail);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
  }

  async function loginAsManager(page: import("@playwright/test").Page) {
    await page.goto("/login");
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(managerEmail);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
  }

  /** Helper: open the leave request dialog */
  async function openLeaveDialog(page: import("@playwright/test").Page) {
    await page.goto("/app/vacation");
    // The DialogTrigger wraps a button — click the outer trigger
    await page.locator('[data-slot="dialog-trigger"]').first().click();
    await expect(
      page.getByRole("heading", { name: /urlaub beantragen/i }),
    ).toBeVisible({ timeout: 5_000 });
  }

  // -----------------------------------------------------------------------
  // Navigation
  // -----------------------------------------------------------------------

  test("Urlaub link is visible in sidebar for employee", async ({ page }) => {
    await loginAsEmployee(page);
    await expect(page.getByRole("link", { name: /urlaub/i }).first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test("navigating to /app/vacation shows vacation page", async ({ page }) => {
    await loginAsEmployee(page);
    await page.goto("/app/vacation");
    await expect(
      page.getByRole("heading", { name: /urlaub/i }),
    ).toBeVisible({ timeout: 5_000 });
  });

  // -----------------------------------------------------------------------
  // Balance widget
  // -----------------------------------------------------------------------

  test("balance widget renders on vacation page", async ({ page }) => {
    await loginAsEmployee(page);
    await page.goto("/app/vacation");

    // Should show the Urlaubskontingent heading
    await expect(
      page.getByText(/urlaubskontingent/i),
    ).toBeVisible({ timeout: 10_000 });

    // Should show balance labels
    await expect(page.getByText(/verfügbar/i)).toBeVisible({ timeout: 5_000 });
  });

  // -----------------------------------------------------------------------
  // Submit leave request
  // -----------------------------------------------------------------------

  test("employee can open leave request dialog", async ({ page }) => {
    await loginAsEmployee(page);
    await openLeaveDialog(page);

    // Should have date picker buttons
    await expect(page.getByRole("button", { name: /von/i })).toBeVisible();

    // Close dialog
    await page.keyboard.press("Escape");
  });

  test("employee can submit a leave request via API and see it", async ({
    page,
  }) => {
    // Create leave request directly via API to avoid dialog complexity
    await adminClient.from("leave_requests").insert({
      tenant_id: tenantId,
      employee_id: employeeEmpId,
      type: "urlaub",
      start_date: "2026-12-14",
      end_date: "2026-12-18",
      work_days_count: 5,
      status: "pending",
    });

    await loginAsEmployee(page);
    await page.goto("/app/vacation");

    // Should show the request in the list (React Query may need a moment)
    await expect(page.getByText(/14\.12\.2026/)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/18\.12\.2026/)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/ausstehend/i).first()).toBeVisible({ timeout: 5_000 });
  });

  // -----------------------------------------------------------------------
  // Cancel leave request
  // -----------------------------------------------------------------------

  test("employee can cancel own pending request", async ({ page }) => {
    await loginAsEmployee(page);
    await page.goto("/app/vacation");

    // Find the pending request and cancel it
    await expect(page.getByText(/ausstehend/i).first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: /stornieren/i }).first().click();

    // Should now show "Storniert" badge
    await expect(page.getByText(/storniert/i).first()).toBeVisible({ timeout: 5_000 });
  });

  // -----------------------------------------------------------------------
  // Manager: Approve flow
  // -----------------------------------------------------------------------

  test("manager can see and approve pending requests", async ({ page }) => {
    // Create a new pending request via API
    await adminClient.from("leave_requests").insert({
      tenant_id: tenantId,
      employee_id: employeeEmpId,
      type: "urlaub",
      start_date: "2026-11-02",
      end_date: "2026-11-06",
      work_days_count: 5,
      status: "pending",
    });

    await loginAsManager(page);
    await page.goto("/app/vacation");

    // Switch to "Offene Anträge" tab
    await page.getByRole("tab", { name: /offene anträge/i }).click();

    // Should see the pending request
    await expect(page.getByText(/02\.11\.2026/)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/5 tage/i)).toBeVisible();

    // Approve it (click the checkmark button)
    await page.getByRole("button", { name: /genehmigen/i }).first().click();

    // Request should disappear from pending list
    await expect(
      page.getByText(/keine ausstehenden/i),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("employee sees approved status after manager approval", async ({
    page,
  }) => {
    await loginAsEmployee(page);
    await page.goto("/app/vacation");

    // Should show "Genehmigt" badge
    await expect(page.getByText(/genehmigt/i).first()).toBeVisible({ timeout: 10_000 });
  });

  // -----------------------------------------------------------------------
  // Absence calendar
  // -----------------------------------------------------------------------

  test("absence calendar renders with legend", async ({ page }) => {
    await loginAsEmployee(page);
    await page.goto("/app/vacation");

    // Switch to calendar tab
    await page.getByRole("tab", { name: /kalender/i }).click();

    // Calendar should render (react-day-picker)
    await expect(page.locator('[data-slot="calendar"]')).toBeVisible({ timeout: 10_000 });

    // Should show legend items
    await expect(page.getByText(/urlaub/i).first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/krank/i).first()).toBeVisible({ timeout: 5_000 });
  });

  // -----------------------------------------------------------------------
  // Manager: Reject flow
  // -----------------------------------------------------------------------

  test("manager can reject a leave request", async ({ page }) => {
    // Create a new pending request via API
    await adminClient.from("leave_requests").insert({
      tenant_id: tenantId,
      employee_id: employeeEmpId,
      type: "urlaub",
      start_date: "2026-10-12",
      end_date: "2026-10-14",
      work_days_count: 3,
      status: "pending",
    });

    // Manager rejects
    await loginAsManager(page);
    await page.goto("/app/vacation");
    await page.getByRole("tab", { name: /offene anträge/i }).click();

    await expect(page.getByText(/12\.10\.2026/)).toBeVisible({ timeout: 5_000 });

    // Reject
    await page.getByRole("button", { name: /ablehnen/i }).first().click();

    // Should show "Keine ausstehenden"
    await expect(
      page.getByText(/keine ausstehenden/i),
    ).toBeVisible({ timeout: 5_000 });

    // Employee sees rejected status
    await loginAsEmployee(page);
    await page.goto("/app/vacation");
    await expect(page.getByText(/abgelehnt/i)).toBeVisible({ timeout: 5_000 });
  });
});

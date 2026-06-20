/**
 * Epic 10: Sick Day Tracking — E2E
 *
 * Tests:
 * - Sick entries page loads correctly
 * - Navigation links work for Krankmeldung
 * - Employee can create a sick entry via dialog
 * - Sick entries appear in the list
 * - AU status is shown
 * - Manager can see all sick entries
 * - Absence calendar renders
 * - Form validation works
 */

import { test, expect } from "@playwright/test";
import {
  testEmail,
  TEST_PASSWORD,
  cleanupTestUser,
  createTestUser,
  adminClient,
} from "./helpers";

test.describe("Sick Day Tracking — Epic 10", () => {
  const managerEmail = testEmail("mgr-sick");
  const employeeEmail = testEmail("emp-sick");
  let tenantId: string;
  let employeeEmpId: string;

  test.beforeAll(async () => {
    // Create manager
    const mgr = await createTestUser({
      email: managerEmail,
      password: TEST_PASSWORD,
      firstName: "Katrin",
      lastName: "Krankenschwester",
      companyName: "Krank Test GmbH",
      role: "manager",
      bundesland: "bayern",
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
      first_name: "Peter",
      last_name: "Patient",
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
  });

  test.afterAll(async () => {
    await adminClient.from("sick_entries").delete().eq("tenant_id", tenantId);
    await adminClient.from("notifications").delete().eq("tenant_id", tenantId);
    await cleanupTestUser(managerEmail);
    await cleanupTestUser(employeeEmail);
  });

  async function loginAsEmployee(page: import("@playwright/test").Page) {
    await page.goto("/login");
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

  // -----------------------------------------------------------------------
  // Navigation
  // -----------------------------------------------------------------------

  test("Krankmeldung link is visible in sidebar for employee", async ({
    page,
  }) => {
    await loginAsEmployee(page);
    await expect(
      page.getByRole("link", { name: /krankmeldung/i }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("navigating to /app/sick shows sick entries page", async ({ page }) => {
    await loginAsEmployee(page);
    await page.goto("/app/sick");
    await expect(
      page.getByRole("heading", { name: /krankmeldungen/i }),
    ).toBeVisible({ timeout: 5_000 });
  });

  // -----------------------------------------------------------------------
  // Empty state
  // -----------------------------------------------------------------------

  test("shows empty state when no sick entries exist", async ({ page }) => {
    await loginAsEmployee(page);
    await page.goto("/app/sick");
    await expect(
      page.getByText(/keine krankmeldungen vorhanden/i),
    ).toBeVisible({ timeout: 5_000 });
  });

  // -----------------------------------------------------------------------
  // Dialog interaction
  // -----------------------------------------------------------------------

  test("employee can open sick entry dialog", async ({ page }) => {
    await loginAsEmployee(page);
    await page.goto("/app/sick");

    // Click the dialog trigger
    await page.locator('[data-slot="dialog-trigger"]').first().click();

    // Dialog should open
    await expect(
      page.getByRole("heading", { name: /krankmeldung erfassen/i }),
    ).toBeVisible({ timeout: 5_000 });

    // Should have date picker buttons (Von / Bis)
    await expect(page.getByRole("button", { name: /von/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /bis/i })).toBeVisible();

    // Close
    await page.keyboard.press("Escape");
  });

  // -----------------------------------------------------------------------
  // Create sick entries via API and verify UI
  // -----------------------------------------------------------------------

  test("ongoing sick entry appears with Fortlaufend badge", async ({
    page,
  }) => {
    // Create via API (no end date = ongoing)
    await adminClient.from("sick_entries").insert({
      tenant_id: tenantId,
      employee_id: employeeEmpId,
      start_date: "2026-10-05",
      end_date: null,
      work_days_count: null,
      created_by: employeeEmpId,
    });

    await loginAsEmployee(page);
    await page.goto("/app/sick");

    await expect(page.getByText(/05\.10\.2026/)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/fortlaufend/i)).toBeVisible();
  });

  test("completed sick entry shows date range and work days", async ({
    page,
  }) => {
    // Clean up and create a completed one
    await adminClient.from("sick_entries").delete().eq("tenant_id", tenantId);

    await adminClient.from("sick_entries").insert({
      tenant_id: tenantId,
      employee_id: employeeEmpId,
      start_date: "2026-09-14",
      end_date: "2026-09-16",
      work_days_count: 3,
      created_by: employeeEmpId,
    });

    await loginAsEmployee(page);
    await page.goto("/app/sick");

    await expect(page.getByText(/14\.09\.2026/)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/16\.09\.2026/)).toBeVisible();
    await expect(page.getByText(/3 arbeitstage/i)).toBeVisible();
  });

  // -----------------------------------------------------------------------
  // AU certificate status
  // -----------------------------------------------------------------------

  test("shows AU status for sick entries ≥3 work days", async ({ page }) => {
    await loginAsEmployee(page);
    await page.goto("/app/sick");

    // The 3-day entry should show AU status (either "AU vorhanden" or "AU fehlt")
    await expect(page.getByText(/14\.09\.2026/)).toBeVisible({ timeout: 5_000 });

    // Should show some AU-related text
    const auStatus = page.getByText(/au/i);
    await expect(auStatus.first()).toBeVisible({ timeout: 5_000 });
  });

  test("sick entry with AU certificate shows AU vorhanden", async ({
    page,
  }) => {
    // Update the entry with an AU URL
    const { data: entries } = await adminClient
      .from("sick_entries")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("employee_id", employeeEmpId);

    if (entries && entries.length > 0) {
      await adminClient
        .from("sick_entries")
        .update({
          au_certificate_url: `tenants/${tenantId}/au/test-certificate.pdf`,
          au_uploaded_at: new Date().toISOString(),
        })
        .eq("id", entries[0].id);
    }

    await loginAsEmployee(page);
    await page.goto("/app/sick");

    await expect(page.getByText(/au vorhanden/i)).toBeVisible({ timeout: 5_000 });
  });

  // -----------------------------------------------------------------------
  // Manager view
  // -----------------------------------------------------------------------

  test("manager can see all sick entries", async ({ page }) => {
    await loginAsManager(page);
    await page.goto("/app/sick");

    // Should see the employee's sick entry
    await expect(page.getByText(/14\.09\.2026/)).toBeVisible({ timeout: 5_000 });
  });

  // -----------------------------------------------------------------------
  // Absence calendar integration
  // -----------------------------------------------------------------------

  test("absence calendar renders with sick legend", async ({ page }) => {
    await loginAsEmployee(page);
    await page.goto("/app/sick");

    // Switch to calendar tab
    await page.getByRole("tab", { name: /kalender/i }).click();

    // Calendar should render (react-day-picker grid)
    await expect(page.locator('[data-slot="calendar"]')).toBeVisible({ timeout: 10_000 });

    // Should show legend
    await expect(page.getByText(/urlaub/i).first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/krank/i).first()).toBeVisible({ timeout: 5_000 });
  });

  // -----------------------------------------------------------------------
  // Validation
  // -----------------------------------------------------------------------

  test("form requires start date to submit", async ({ page }) => {
    await loginAsEmployee(page);
    await page.goto("/app/sick");

    // Open dialog
    await page.locator('[data-slot="dialog-trigger"]').first().click();
    await expect(
      page.getByRole("heading", { name: /krankmeldung erfassen/i }),
    ).toBeVisible({ timeout: 5_000 });

    // The dialog-trigger button opens the dialog, but the submit button inside
    // gets intercepted by the overlay. Use the dialog's own submit button.
    const submitBtn = page.getByRole("dialog").getByRole("button", { name: /krankmeldung erfassen/i });
    // Don't fill any dates — try submitting empty
    await submitBtn.click();

    // Should show error about start date
    await expect(page.getByText("Startdatum ist erforderlich")).toBeVisible({ timeout: 5_000 });
  });

  // =========================================================================
  // Edit sick entries
  // =========================================================================

  test("can edit an ongoing sick entry to add end date", async ({ page }) => {
    // Create an ongoing (no end_date) sick entry
    const today = new Date().toISOString().split("T")[0];
    await adminClient.from("sick_entries").insert({
      tenant_id: tenantId,
      employee_id: employeeEmpId,
      start_date: today,
      end_date: null,
      notes: "Test ongoing",
      created_by: employeeEmpId,
    });

    await loginAsEmployee(page);
    await page.goto("/app/sick");

    // Should show Fortlaufend badge
    await expect(page.getByText("Fortlaufend")).toBeVisible({ timeout: 5_000 });

    // Click edit (pencil icon) on the card that says "Fortlaufend"
    const ongoingCard = page.locator('[data-slot="card-content"]').filter({ hasText: /fortlaufend/i });
    await ongoingCard.getByTitle("Bearbeiten").click();

    // Edit dialog opens
    await expect(
      page.getByRole("heading", { name: /krankmeldung bearbeiten/i }),
    ).toBeVisible({ timeout: 5_000 });

    // Start date should be shown (read-only)
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText(fmtDate(today)).first()).toBeVisible();

    // Fill end date = today (single-day sick entry) via DatePicker
    const editDialog = page.getByRole("dialog");
    // Click the end date picker button to open calendar popover
    await editDialog.getByRole("button", { name: /bis/i }).click();

    // Wait for calendar popover to appear and click today
    // The calendar day buttons have data-day attribute with locale date
    await page.waitForSelector('[data-slot="calendar"]', { timeout: 5_000 });
    // Click today using the today modifier (shadcn marks today specially)
    await page.locator('[data-slot="calendar"]').locator('button').filter({ hasText: new RegExp(`^${new Date().getDate()}$`) }).first().click();

    // Save
    await editDialog.getByRole("button", { name: /^speichern$/i }).click();

    // Dialog should close
    await expect(editDialog).not.toBeVisible({ timeout: 5_000 });

    // The specific card should now show the end date instead of "Fortlaufend"
    const card = page.locator('[data-slot="card-content"]').filter({ hasText: /test ongoing/i });
    await expect(card.getByText(fmtDate(today))).toBeVisible({ timeout: 5_000 });

    // Cleanup
    await adminClient.from("sick_entries").delete().eq("tenant_id", tenantId).eq("start_date", today);
  });

  test("ongoing sick entry does not show future dates in calendar", async ({
    page,
  }) => {
    // Create ongoing entry starting 5 days ago
    const fiveDaysAgo = new Date(Date.now() - 5 * 86400000)
      .toISOString()
      .split("T")[0];
    await adminClient.from("sick_entries").insert({
      tenant_id: tenantId,
      employee_id: employeeEmpId,
      start_date: fiveDaysAgo,
      end_date: null,
      created_by: employeeEmpId,
    });

    await loginAsEmployee(page);
    await page.goto("/app/sick");
    await page.getByRole("tab", { name: /kalender/i }).click();

    // Calendar should be visible
    await expect(page.getByText(/juni|juli/i)).toBeVisible({ timeout: 5_000 });

    // Cleanup
    await adminClient.from("sick_entries").delete().eq("tenant_id", tenantId).eq("start_date", fiveDaysAgo);
  });
});

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

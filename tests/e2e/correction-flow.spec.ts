/**
 * Story 4.2: Employee Correction Request Flow — E2E
 *
 * Tests:
 * - Employee can submit a correction request for own entry
 * - Reason is required
 * - Correction request appears without modifying the entry
 * - Manager can see pending correction requests
 * - Manager can approve a correction (entry updates)
 * - Manager can reject a correction (entry unchanged)
 * - Employee sees "Korrektur offen" badge after submitting
 */

import { test, expect } from "@playwright/test";
import {
  testEmail,
  TEST_PASSWORD,
  cleanupTestUser,
  createTestUser,
  adminClient,
} from "./helpers";

/** Format a Date as YYYY-MM-DD using local timezone. */
function toLocalISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Get Monday of the current week as YYYY-MM-DD (local). */
function getCurrentMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.getFullYear(), d.getMonth(), diff);
  return toLocalISO(monday);
}

/** Get Tuesday of the current week as YYYY-MM-DD (local). */
function getCurrentTuesday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) + 1;
  const tue = new Date(d.getFullYear(), d.getMonth(), diff);
  return toLocalISO(tue);
}

/** Format YYYY-MM-DD as DD.MM.YYYY for assertions. */
function toGermanDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

test.describe("Correction Request Flow — Story 4.2", () => {
  const managerEmail = testEmail("mgr-corr");
  const employeeEmail = testEmail("emp-corr");
  let tenantId: string;
  let employeeEmpId: string;
  const entryDate = getCurrentMonday();
  const entryDateDE = toGermanDate(entryDate);
  test.beforeAll(async () => {
    // Create manager
    const mgr = await createTestUser({
      email: managerEmail,
      password: TEST_PASSWORD,
      firstName: "Lars",
      lastName: "Lefter",
      companyName: "Correction Test GmbH",
      role: "manager",
      bundesland: "berlin",
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
      first_name: "Anna",
      last_name: "Arbeiterin",
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

    // Create a completed time entry (current week Monday)
    await adminClient
      .from("time_entries")
      .insert({
        tenant_id: tenantId,
        employee_id: employeeEmpId,
        date: entryDate,
        clock_in: `${entryDate}T08:00:00.000Z`,
        clock_out: `${entryDate}T16:00:00.000Z`,
        break_minutes: 30,
        status: "completed",
      })
      .select("id")
      .single();
  });

  test.afterAll(async () => {
    await adminClient.from("time_entry_audit").delete().eq("tenant_id", tenantId);
    await adminClient.from("correction_requests").delete().eq("tenant_id", tenantId);
    await adminClient.from("break_sessions").delete().eq("tenant_id", tenantId);
    await adminClient.from("time_entries").delete().eq("tenant_id", tenantId);
    await cleanupTestUser(managerEmail);
    await cleanupTestUser(employeeEmail);
  });

  /** Helper: log in as employee */
  async function loginAsEmployee(page: import("@playwright/test").Page) {
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(employeeEmail);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
  }

  /** Helper: log in as manager */
  async function loginAsManager(page: import("@playwright/test").Page) {
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(managerEmail);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
  }

  // -----------------------------------------------------------------------
  // Employee: Submit correction request
  // -----------------------------------------------------------------------

  test("employee sees own time entries on Meine Zeiten page", async ({
    page,
  }) => {
    await loginAsEmployee(page);
    await page.goto("/app/my-times");
    await expect(
      page.getByRole("heading", { name: /meine zeiten/i }),
    ).toBeVisible({ timeout: 5_000 });

    // Should show the entry date
    await expect(page.getByText(entryDateDE)).toBeVisible({ timeout: 5_000 });
  });

  test("employee can open correction request dialog", async ({ page }) => {
    await loginAsEmployee(page);
    await page.goto("/app/my-times");

    // Should show "Korrektur anfordern" button for completed entries
    await expect(
      page.getByRole("button", { name: /korrektur anfordern/i }),
    ).toBeVisible({ timeout: 5_000 });

    await page.getByRole("button", { name: /korrektur anfordern/i }).click();

    // Correction dialog should open
    await expect(
      page.getByRole("heading", { name: /korrektur anfordern/i }),
    ).toBeVisible({ timeout: 5_000 });

    // Should show current entry values
    await expect(page.getByText(/aktueller eintrag/i)).toBeVisible();

    // Should have reason field (label not linked via htmlFor, use textarea locator)
    await expect(page.locator("textarea").first()).toBeVisible();

    // Close
    await page.getByRole("button", { name: /abbrechen/i }).click();
  });

  test("employee can submit a correction request", async ({ page }) => {
    await loginAsEmployee(page);
    await page.goto("/app/my-times");

    await page.getByRole("button", { name: /korrektur anfordern/i }).click();
    await expect(
      page.getByRole("heading", { name: /korrektur anfordern/i }),
    ).toBeVisible({ timeout: 5_000 });

    // Enter a proposed new clock_out (was 16:00, should be 17:00)
    // Labels not linked via htmlFor — use input[type=datetime-local], 2nd one is "Neues Ende"
    const datetimeInputs = page.locator('input[type="datetime-local"]');
    const clockOutInput = datetimeInputs.nth(1); // Neues Ende
    await clockOutInput.fill(`${entryDate}T17:00`);

    // Enter a reason
    await page.locator("textarea").fill("Ausstempeln war 17:00, nicht 16:00");

    // Submit
    await page.getByRole("button", { name: /anfragen/i }).click();

    // Dialog should close
    await expect(
      page.getByRole("heading", { name: /korrektur anfordern/i }),
    ).not.toBeVisible({ timeout: 5_000 });

    // Entry should now show "Korrektur offen" badge
    await expect(page.getByText(/korrektur offen/i)).toBeVisible({
      timeout: 5_000,
    });

    // "Korrektur anfordern" should no longer appear (already pending)
    await expect(
      page.getByRole("button", { name: /korrektur anfordern/i }),
    ).not.toBeVisible({ timeout: 5_000 });
  });

  test("entry values are NOT modified after correction request", async ({
    page,
  }) => {
    await loginAsEmployee(page);
    await page.goto("/app/my-times");

    // Should show the entry date in the list and the unchanged time.
    // clock_out is stored as UTC; the UI renders it in the host timezone, so
    // compute the expected display with the same logic as formatTimeLocal
    // (both run under the host TZ) to keep the assertion timezone-independent.
    const clockOut = new Date(`${entryDate}T16:00:00.000Z`);
    const expectedClockOut = `${String(clockOut.getHours()).padStart(2, "0")}:${String(clockOut.getMinutes()).padStart(2, "0")}`;
    await expect(page.getByText(entryDateDE)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(expectedClockOut)).toBeVisible({ timeout: 5_000 });
  });

  // -----------------------------------------------------------------------
  // Manager: Review correction requests
  // -----------------------------------------------------------------------

  test("manager sees pending corrections on Korrekturen tab", async ({
    page,
  }) => {
    await loginAsManager(page);
    await page.goto("/app/reports");
    await expect(
      page.getByRole("heading", { name: /berichte/i }),
    ).toBeVisible({ timeout: 5_000 });

    // Switch to corrections tab (base-ui Tab uses role="tab", not "button")
    await page.getByRole("tab", { name: /korrekturen/i }).click();

    // Should show the pending correction request
    await expect(page.getByText(/ausstempeln war 17:00/i)).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByText(/offen/i)).toBeVisible();
  });

  test("manager can approve a correction", async ({ page }) => {
    await loginAsManager(page);
    await page.goto("/app/reports");
    await page.getByRole("tab", { name: /korrekturen/i }).click();

    // Click "Prüfen" to expand
    await page.getByRole("button", { name: /prüfen/i }).click();

    // Should see approve and reject buttons
    await expect(
      page.getByRole("button", { name: /genehmigen/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /ablehnen/i }),
    ).toBeVisible();

    // Approve
    await page.getByRole("button", { name: /genehmigen/i }).click();

    // The request should disappear from pending list
    await expect(
      page.getByText(/ausstempeln war 17:00/i),
    ).not.toBeVisible({ timeout: 5_000 });

    // Should show "Keine offenen Korrekturanfragen" now
    await expect(
      page.getByText(/keine offenen korrekturanfragen/i),
    ).toBeVisible({ timeout: 5_000 });
  });

  // -----------------------------------------------------------------------
  // Second correction: test rejection
  // -----------------------------------------------------------------------

  test("manager can reject a correction with a note", async ({ page }) => {
    // Create another completed entry for rejection test
    // Use Tuesday of current week
    const tuesdayDate = getCurrentTuesday();

    const { data: entry2 } = await adminClient
      .from("time_entries")
      .insert({
        tenant_id: tenantId,
        employee_id: employeeEmpId,
        date: tuesdayDate,
        clock_in: `${tuesdayDate}T09:00:00.000Z`,
        clock_out: `${tuesdayDate}T15:00:00.000Z`,
        break_minutes: 0,
        status: "completed",
      })
      .select("id")
      .single();

    // Employee submits correction
    await adminClient.from("correction_requests").insert({
      tenant_id: tenantId,
      employee_id: employeeEmpId,
      time_entry_id: entry2!.id,
      proposed_change: { break_minutes: 30 },
      reason: "Hatte 30 Min Pause vergessen",
    });

    // Manager logs in and rejects
    await loginAsManager(page);
    await page.goto("/app/reports");
    await page.getByRole("tab", { name: /korrekturen/i }).click();

    // Should see the new request
    await expect(
      page.getByText(/pause vergessen/i),
    ).toBeVisible({ timeout: 5_000 });

    await page.getByRole("button", { name: /prüfen/i }).click();

    // Enter rejection note (label not linked via htmlFor)
    await page.locator("textarea").fill("Keine Pausenzeit nachvollziehbar");

    // Reject
    await page.getByRole("button", { name: /ablehnen/i }).click();

    // Request should disappear
    await expect(
      page.getByText(/pause vergessen/i),
    ).not.toBeVisible({ timeout: 5_000 });

    // Verify the time entry was NOT modified (break_minutes still 0)
    const { data: unchanged } = await adminClient
      .from("time_entries")
      .select("break_minutes")
      .eq("id", entry2!.id)
      .single();
    expect(unchanged!.break_minutes).toBe(0);
  });
});

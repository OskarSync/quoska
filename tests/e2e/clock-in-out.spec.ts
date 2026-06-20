/**
 * Story 2.1: Clock In / Out — Full E2E test
 *
 * Tests the complete clock in/out cycle through the UI:
 * - Clock in creates a running time entry
 * - UI updates to show "Ausstempeln" button and live duration
 * - Clock out completes the entry and shows summary
 * - Prevents concurrent entries (409)
 * - Shows "not clocked in" state when no active entry
 */

import { test, expect } from "@playwright/test";
import { testEmail, TEST_PASSWORD, cleanupTestUser, createTestUser, adminClient } from "./helpers";

test.describe("Clock In / Out — Story 2.1", () => {
  const email = testEmail("clock21");

  test.beforeAll(async () => {
    await createTestUser({
      email,
      password: TEST_PASSWORD,
      firstName: "Elena",
      lastName: "Employee",
      companyName: "Clock E2E GmbH",
      role: "employee",
      bundesland: "berlin",
    });
  });

  test.afterAll(async () => {
    await cleanupTestUser(email);
  });

  /** Helper: log in and navigate to clock page */
  async function goToClockPage(page: import("@playwright/test").Page) {
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
    await page.goto("/app/clock");
    await expect(page.getByRole("heading", { name: /stempeln/i })).toBeVisible({ timeout: 5_000 });
  }

  /** Helper: clean up any active time entries for this user */
  async function cleanupTimeEntries() {
    const { data: employees } = await adminClient
      .from("employees")
      .select("id, tenant_id")
      .eq("email", email);
    if (!employees?.length) return;

    const emp = employees[0];
    await adminClient.from("time_entry_audit").delete().eq("tenant_id", emp.tenant_id);
    await adminClient.from("break_sessions").delete().eq("tenant_id", emp.tenant_id);
    await adminClient.from("time_entries").delete().eq("tenant_id", emp.tenant_id).eq("employee_id", emp.id);
  }

  test("shows 'Stempeln' button when not clocked in", async ({ page }) => {
    await cleanupTimeEntries();
    await goToClockPage(page);

    // Should show the main "Stempeln" button
    const clockBtn = page.getByRole("button", { name: /^stempeln$/i });
    await expect(clockBtn).toBeVisible({ timeout: 5_000 });

    // Should NOT show "Ausstempeln"
    await expect(page.getByRole("button", { name: /ausstempeln/i })).not.toBeVisible();

    // Should NOT show "Pause starten"
    await expect(page.getByRole("button", { name: /pause starten/i })).not.toBeVisible();
  });

  test("can clock in and see running state", async ({ page }) => {
    await cleanupTimeEntries();
    await goToClockPage(page);

    // Click Stempeln
    await page.getByRole("button", { name: /^stempeln$/i }).click();

    // Button should change to "Ausstempeln"
    await expect(page.getByRole("button", { name: /ausstempeln/i })).toBeVisible({ timeout: 5_000 });

    // Should show "Seit HH:MM" sublabel (clock-in time)
    await expect(page.getByText(/seit \d{2}:\d{2}/i)).toBeVisible({ timeout: 5_000 });

    // Should show daily progress (format: "Xm / Yh Soll")
    await expect(page.getByText(/soll/i)).toBeVisible({ timeout: 5_000 });

    // "Pause starten" button should appear
    await expect(page.getByRole("button", { name: /pause starten/i })).toBeVisible();
  });

  test("can clock out after clocking in and see summary", async ({ page }) => {
    await cleanupTimeEntries();
    await goToClockPage(page);

    // Clock in
    await page.getByRole("button", { name: /^stempeln$/i }).click();
    await expect(page.getByRole("button", { name: /ausstempeln/i })).toBeVisible({ timeout: 5_000 });

    // Wait a moment so there's measurable duration
    await page.waitForTimeout(2_000);

    // Clock out
    await page.getByRole("button", { name: /ausstempeln/i }).click();

    // Should return to "Stempeln" button
    await expect(page.getByRole("button", { name: /^stempeln$/i })).toBeVisible({ timeout: 5_000 });

    // Should show today's summary (last completed entry)
    await expect(page.getByText(/heute/i)).toBeVisible({ timeout: 5_000 });
  });

  test("cannot clock in twice (concurrent prevention)", async ({ page }) => {
    await cleanupTimeEntries();
    await goToClockPage(page);

    // Clock in
    await page.getByRole("button", { name: /^stempeln$/i }).click();
    await expect(page.getByRole("button", { name: /ausstempeln/i })).toBeVisible({ timeout: 5_000 });

    // The "Stempeln" button should NOT be visible anymore
    await expect(page.getByRole("button", { name: /^stempeln$/i })).not.toBeVisible();

    // Clean up
    await page.getByRole("button", { name: /ausstempeln/i }).click();
  });

  test("clock state persists after page reload", async ({ page }) => {
    await cleanupTimeEntries();
    await goToClockPage(page);

    // Clock in
    await page.getByRole("button", { name: /^stempeln$/i }).click();
    await expect(page.getByRole("button", { name: /ausstempeln/i })).toBeVisible({ timeout: 5_000 });

    // Reload the page
    await page.reload();
    await expect(page.getByRole("heading", { name: /stempeln/i })).toBeVisible({ timeout: 5_000 });

    // Should still show "Ausstempeln" — server state persisted
    await expect(page.getByRole("button", { name: /ausstempeln/i })).toBeVisible({ timeout: 5_000 });

    // Clean up
    await page.getByRole("button", { name: /ausstempeln/i }).click();
  });

  test("week summary is visible on clock page", async ({ page }) => {
    await cleanupTimeEntries();
    await goToClockPage(page);

    // Should show "Diese Woche" section
    await expect(page.getByText(/diese woche/i)).toBeVisible({ timeout: 5_000 });
  });
});

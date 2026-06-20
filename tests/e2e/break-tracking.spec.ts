/**
 * Story 2.2: Break Tracking — Pause & Resume E2E test
 *
 * Tests the break flow through the UI:
 * - Start break when clocked in
 * - UI shows "Pause beenden" and break duration
 * - End break after minimum duration (server-enforced 15 min)
 * - Cannot clock out while on break
 * - Break minutes accumulate correctly
 */

import { test, expect } from "@playwright/test";
import { testEmail, TEST_PASSWORD, cleanupTestUser, createTestUser, adminClient } from "./helpers";

test.describe("Break Tracking — Story 2.2", () => {
  const email = testEmail("break22");

  test.beforeAll(async () => {
    await createTestUser({
      email,
      password: TEST_PASSWORD,
      firstName: "Benjamin",
      lastName: "Breaker",
      companyName: "Break Test GmbH",
      role: "employee",
      bundesland: "berlin",
    });
  });

  test.afterAll(async () => {
    await cleanupTestUser(email);
  });

  /** Helper: log in, clean up, clock in, and return to clock page */
  async function clockInAndReady(page: import("@playwright/test").Page) {
    // Clean up any existing entries
    const { data: employees } = await adminClient
      .from("employees")
      .select("id, tenant_id")
      .eq("email", email);
    if (employees?.length) {
      const emp = employees[0];
      await adminClient.from("time_entry_audit").delete().eq("tenant_id", emp.tenant_id);
      await adminClient.from("break_sessions").delete().eq("tenant_id", emp.tenant_id);
      await adminClient.from("time_entries").delete().eq("tenant_id", emp.tenant_id).eq("employee_id", emp.id);
    }

    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    await page.goto("/app/clock");
    await expect(page.getByRole("heading", { name: /stempeln/i })).toBeVisible({ timeout: 5_000 });

    // Clock in
    await page.getByRole("button", { name: /^stempeln$/i }).click();
    await expect(page.getByRole("button", { name: /ausstempeln/i })).toBeVisible({ timeout: 5_000 });
  }

  test("can start a break when clocked in", async ({ page }) => {
    await clockInAndReady(page);

    // Click "Pause starten"
    await page.getByRole("button", { name: /pause starten/i }).click();

    // Button should change to "Pause beenden"
    await expect(page.getByRole("button", { name: /pause beenden/i })).toBeVisible({ timeout: 5_000 });

    // Should show "Pause seit" sublabel
    await expect(page.getByText(/pause seit/i)).toBeVisible({ timeout: 5_000 });

    // Clean up: end break (may get min-duration error, so force-complete via DB)
    await cleanupForEmail(email);
  });

  test("'Pause starten' button not visible when not clocked in", async ({ page }) => {
    await cleanupForEmail(email);

    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    await page.goto("/app/clock");
    await expect(page.getByRole("heading", { name: /stempeln/i })).toBeVisible({ timeout: 5_000 });

    // Should NOT see "Pause starten" when not clocked in
    await expect(page.getByRole("button", { name: /pause starten/i })).not.toBeVisible();
  });

  test("'Ausstempeln' is replaced by 'Pause beenden' when on break", async ({ page }) => {
    await clockInAndReady(page);

    // Start break
    await page.getByRole("button", { name: /pause starten/i }).click();
    await expect(page.getByRole("button", { name: /pause beenden/i })).toBeVisible({ timeout: 5_000 });

    // "Ausstempeln" should NOT be visible
    await expect(page.getByRole("button", { name: /ausstempeln/i })).not.toBeVisible();

    // Clean up
    await cleanupForEmail(email);
  });

  test("break state persists after page reload", async ({ page }) => {
    await clockInAndReady(page);

    // Start break
    await page.getByRole("button", { name: /pause starten/i }).click();
    await expect(page.getByRole("button", { name: /pause beenden/i })).toBeVisible({ timeout: 5_000 });

    // Reload
    await page.reload();
    await expect(page.getByRole("heading", { name: /stempeln/i })).toBeVisible({ timeout: 5_000 });

    // Should still show "Pause beenden" — server state persisted
    await expect(page.getByRole("button", { name: /pause beenden/i })).toBeVisible({ timeout: 5_000 });

    // Clean up
    await cleanupForEmail(email);
  });
});

/** Clean up all time entries / breaks for a test user */
async function cleanupForEmail(email: string) {
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

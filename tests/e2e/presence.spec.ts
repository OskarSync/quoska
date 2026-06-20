/**
 * Story 9.1: Presence — persistent header + Discord-style right panel.
 *
 * The "Anwesenheit" feature is no longer a tab. Instead:
 * - A permanent top header shows the current tab name on the left.
 * - The right of the header has the user's own clock in/out control and an
 *   "Anwesenheit" toggle button.
 * - Clicking the toggle opens a scrollable right-side panel listing who is
 *   currently in / paused / off.
 *
 * Covered:
 * - Header is present on every app page with the tab name on the left.
 * - The header clock widget works (hidden on /app/clock, visible elsewhere).
 * - The Anwesenheit toggle opens/closes the right panel.
 * - The panel lists all team members; a clocked-in colleague shows as
 *   "Eingestempelt".
 * - Everyone (incl. employees) can see the board.
 * - Clocking in via the header widget reflects on the user's own panel row.
 */

import { test, expect, type Page } from "@playwright/test";
import {
  testEmail,
  TEST_PASSWORD,
  cleanupTestUser,
  createTestUser,
  adminClient,
} from "./helpers";

test.describe("Presence — Header + Right Panel (Story 9.1)", () => {
  const managerEmail = testEmail("pres-mgr");
  const employeeEmail = testEmail("pres-emp");
  let tenantId: string;
  let managerEmpId: string;
  let employeeEmpId: string;

  test.beforeAll(async () => {
    const mgr = await createTestUser({
      email: managerEmail,
      password: TEST_PASSWORD,
      firstName: "Mara",
      lastName: "Managerin",
      companyName: "Presence Test GmbH",
      role: "manager",
      bundesland: "berlin",
    });
    tenantId = mgr.tenantId;

    const { data: auth } = await adminClient.auth.admin.createUser({
      email: employeeEmail,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    await adminClient.from("employees").insert({
      tenant_id: tenantId,
      user_id: auth.user!.id,
      first_name: "Emil",
      last_name: "Mitarbeiter",
      email: employeeEmail,
      role: "employee",
    });
    await adminClient.rpc("set_employee_claims", { user_uuid: auth.user!.id });

    const { data: mgrEmp } = await adminClient
      .from("employees")
      .select("id")
      .eq("email", managerEmail)
      .single();
    const { data: empEmp } = await adminClient
      .from("employees")
      .select("id")
      .eq("email", employeeEmail)
      .single();
    managerEmpId = mgrEmp!.id;
    employeeEmpId = empEmp!.id;
  });

  test.afterAll(async () => {
    await adminClient.from("time_entry_audit").delete().eq("tenant_id", tenantId);
    await adminClient.from("break_sessions").delete().eq("tenant_id", tenantId);
    await adminClient.from("time_entries").delete().eq("tenant_id", tenantId);
    await cleanupTestUser(managerEmail);
    await cleanupTestUser(employeeEmail);
  });

  async function clearEntries() {
    await adminClient
      .from("time_entries")
      .delete()
      .eq("tenant_id", tenantId)
      .in("employee_id", [managerEmpId, employeeEmpId]);
  }

  async function loginAs(page: Page, email: string) {
    await page.goto("/login");
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
  }

  // ---------------------------------------------------------------------
  // Persistent header
  // ---------------------------------------------------------------------

  test("header is present and shows the current tab name on the left", async ({ page }) => {
    await loginAs(page, managerEmail);
    await page.goto("/app/my-times");

    const header = page.getByTestId("app-header");
    await expect(header).toBeVisible({ timeout: 5_000 });
    // Left side reflects the current tab
    await expect(header.getByText("Meine Zeiten", { exact: true })).toBeVisible();
  });

  test("header is persistent across pages and updates the tab name", async ({ page }) => {
    await loginAs(page, managerEmail);

    await page.goto("/app/employees");
    await expect(page.getByTestId("app-header").getByText("Mitarbeiter", { exact: true })).toBeVisible();

    await page.goto("/app/vacation");
    await expect(page.getByTestId("app-header").getByText("Urlaub", { exact: true })).toBeVisible();
  });

  // ---------------------------------------------------------------------
  // Clock widget in the header
  // ---------------------------------------------------------------------

  test("header clock widget clocks in/out (visible on non-clock pages)", async ({ page }) => {
    await clearEntries();
    await loginAs(page, employeeEmail);
    await page.goto("/app/my-times");

    const clockInBtn = page.getByRole("button", { name: /^stempeln$/i });
    await expect(clockInBtn).toBeVisible({ timeout: 5_000 });

    await clockInBtn.click();
    await expect(
      page.getByRole("button", { name: /ausstempeln/i }),
    ).toBeVisible({ timeout: 5_000 });

    await page.getByRole("button", { name: /ausstempeln/i }).click();
    await expect(clockInBtn).toBeVisible({ timeout: 5_000 });

    await clearEntries();
  });

  test("header clock widget is NOT rendered on the dedicated /app/clock page", async ({ page }) => {
    // /app/clock has its own full stamp button; the header widget must be
    // hidden there to avoid a duplicate "Stempeln" button.
    await loginAs(page, employeeEmail);
    await page.goto("/app/clock");

    const header = page.getByTestId("app-header");
    await expect(header).toBeVisible({ timeout: 5_000 });
    await expect(header.getByRole("button", { name: /^stempeln$/i })).toHaveCount(0);
  });

  // ---------------------------------------------------------------------
  // Right-side presence panel
  // ---------------------------------------------------------------------

  test("Anwesenheit toggle opens and closes the right panel", async ({ page }) => {
    await loginAs(page, managerEmail);
    await page.goto("/app/my-times");

    const toggle = page.getByRole("button", { name: /^anwesenheit$/i });
    const panel = page.getByTestId("presence-panel");

    // The panel is always rendered and slides in/out via a transform, so we
    // assert open state via the toggle's aria-expanded and the panel content
    // visibility rather than presence in the DOM.
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    // Open
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(panel.getByText(/von.*anwesend|Keine Mitarbeiter/i)).toBeVisible({ timeout: 5_000 });

    // Close via the panel's close button
    await page.getByRole("button", { name: /anwesenheit schließen/i }).click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  test("panel lists both team members and is openable by employees", async ({ page }) => {
    await loginAs(page, employeeEmail);
    await page.goto("/app/my-times");

    await page.getByRole("button", { name: /^anwesenheit$/i }).click();
    const panel = page.getByTestId("presence-panel");
    await expect(panel).toBeVisible({ timeout: 5_000 });

    await expect(panel.getByText(/Mara Managerin/)).toBeVisible({ timeout: 5_000 });
    await expect(panel.getByText(/Emil Mitarbeiter/)).toBeVisible({ timeout: 5_000 });
  });

  test("a clocked-in colleague appears as Eingestempelt in the panel", async ({ page }) => {
    await clearEntries();

    // Manager clocks in directly in the DB
    const today = new Date().toISOString().slice(0, 10);
    const nowIso = new Date().toISOString();
    await adminClient.from("time_entries").insert({
      tenant_id: tenantId,
      employee_id: managerEmpId,
      date: today,
      clock_in: nowIso,
      status: "running",
    });

    await loginAs(page, employeeEmail);
    await page.goto("/app/my-times");
    await page.getByRole("button", { name: /^anwesenheit$/i }).click();

    const managerRow = page
      .locator('[data-testid="presence-row"]', { hasText: /Mara Managerin/ })
      .first();
    await expect(managerRow).toBeVisible({ timeout: 5_000 });
    await expect(
      managerRow.locator("span").filter({ hasText: /^Eingestempelt$/ }),
    ).toBeVisible({ timeout: 5_000 });

    await clearEntries();
  });

  test("header presence badge shows the count of present colleagues", async ({ page }) => {
    await clearEntries();
    await loginAs(page, employeeEmail);
    await page.goto("/app/my-times");

    const badge = page.getByTestId("presence-count");
    await expect(badge).toBeVisible({ timeout: 5_000 });
    // Nobody is clocked in → 0
    await expect(badge).toHaveText("0");
  });
});

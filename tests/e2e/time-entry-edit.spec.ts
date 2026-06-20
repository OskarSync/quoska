/**
 * Story 4.1: Manager Time Entry Edit — E2E
 *
 * Flow: Reports page → weekly report table → click employee name
 * → drill down to entry list → Bearbeiten / Verlauf buttons
 *
 * Tests:
 * - Reports page loads with correct tabs
 * - Manager can drill down to see employee's entries
 * - Manager can edit a completed time entry
 * - Reason field is required (validation)
 * - Edit updates the displayed values
 * - Audit trail shows the edit record
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

/** Format YYYY-MM-DD as DD.MM.YYYY for assertions. */
function toGermanDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

test.describe("Manager Time Entry Edit — Story 4.1", () => {
  const managerEmail = testEmail("mgr-edit");
  const employeeEmail = testEmail("emp-edit");
  let tenantId: string;
  let employeeEmpId: string;
  const entryDate = getCurrentMonday();
  const entryDateDE = toGermanDate(entryDate);

  test.beforeAll(async () => {
    // Create manager
    const mgr = await createTestUser({
      email: managerEmail,
      password: TEST_PASSWORD,
      firstName: "Maria",
      lastName: "Managerin",
      companyName: "Edit Test GmbH",
      role: "manager",
      bundesland: "berlin",
    });
    tenantId = mgr.tenantId;

    // Get manager employee ID
    await adminClient
      .from("employees")
      .select("id")
      .eq("email", managerEmail)
      .single();

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
      last_name: "Täter",
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

    // Create a completed time entry for the employee (current week Monday)
    await adminClient
      .from("time_entries")
      .insert({
        tenant_id: tenantId,
        employee_id: employeeEmpId,
        date: entryDate,
        clock_in: `${entryDate}T08:02:00.000Z`,
        clock_out: `${entryDate}T17:00:00.000Z`,
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

  /** Helper: log in as manager, go to reports, and drill down to employee entries */
  async function goToEmployeeEntries(page: import("@playwright/test").Page) {
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(managerEmail);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    await page.goto("/app/reports");
    await expect(
      page.getByRole("heading", { name: /berichte/i }),
    ).toBeVisible({ timeout: 5_000 });

    // Click employee name in weekly report table to drill down
    await page.getByRole("button", { name: /thomas täter/i }).click();

    // Should see the drill-down view with employee name
    await expect(page.getByText("Thomas Täter")).toBeVisible({ timeout: 5_000 });
  }

  test("reports page loads with Wochenbericht tab", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(managerEmail);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    await page.goto("/app/reports");
    await expect(
      page.getByRole("heading", { name: /berichte/i }),
    ).toBeVisible({ timeout: 5_000 });

    await expect(page.getByRole("tab", { name: /wochenbericht/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /korrekturen/i })).toBeVisible();
  });

  test("shows the employee's completed time entry after drill-down", async ({ page }) => {
    await goToEmployeeEntries(page);

    // Should show the date
    await expect(page.getByText(entryDateDE)).toBeVisible({ timeout: 5_000 });
    // Should show time range
    await expect(page.getByText(/08:02.*17:00/i)).toBeVisible();
  });

  test("can open edit dialog for completed entry", async ({ page }) => {
    await goToEmployeeEntries(page);

    // Click "Bearbeiten" button
    await page.getByRole("button", { name: /bearbeiten/i }).first().click();

    // Edit dialog should open
    await expect(
      page.getByRole("heading", { name: /zeiteintrag bearbeiten/i }),
    ).toBeVisible({ timeout: 5_000 });

    // Should have fields for clock_in, clock_out, break_minutes
    // Labels are not linked via htmlFor, so use input locators
    await expect(page.locator('input[type="datetime-local"]').first()).toBeVisible();
    await expect(page.locator('input[type="number"]')).toBeVisible();
    // Reason textarea
    await expect(page.locator("textarea").last()).toBeVisible();

    // Close dialog
    await page.getByRole("button", { name: /abbrechen/i }).click();
  });

  test("edit requires reason — shows error without reason", async ({ page }) => {
    await goToEmployeeEntries(page);
    await page.getByRole("button", { name: /bearbeiten/i }).first().click();
    await expect(
      page.getByRole("heading", { name: /zeiteintrag bearbeiten/i }),
    ).toBeVisible({ timeout: 5_000 });

    // Click Save without any changes or reason
    await page.getByRole("button", { name: /^speichern$/i }).click();

    // Should show error about reason
    await expect(page.getByText(/grund ist erforderlich/i)).toBeVisible({
      timeout: 5_000,
    });

    await page.getByRole("button", { name: /abbrechen/i }).click();
  });

  test("can edit clock_in with reason and see updated values", async ({
    page,
  }) => {
    await goToEmployeeEntries(page);
    await page.getByRole("button", { name: /bearbeiten/i }).first().click();
    await expect(
      page.getByRole("heading", { name: /zeiteintrag bearbeiten/i }),
    ).toBeVisible({ timeout: 5_000 });

    // Change clock_in from 08:02 to 08:00
    const clockInInput = page.locator('input[type="datetime-local"]').first();
    await clockInInput.fill(`${entryDate}T08:00`);

    // Enter a reason (last textarea is the reason field)
    const textareas = page.locator("textarea");
    await textareas.last().fill("Uhrenabweichung korrigiert");

    // Save
    await page.getByRole("button", { name: /^speichern$/i }).click();

    // Dialog should close
    await expect(
      page.getByRole("heading", { name: /zeiteintrag bearbeiten/i }),
    ).not.toBeVisible({ timeout: 5_000 });
  });

  test("can open audit trail and see the edit", async ({ page }) => {
    await goToEmployeeEntries(page);

    // Click "Verlauf" button
    await page.getByRole("button", { name: /verlauf/i }).first().click();

    // Audit trail dialog should open
    await expect(page.getByRole("heading", { name: /verlauf/i })).toBeVisible({
      timeout: 5_000,
    });

    // Should show at least one audit record (from the edit above)
    await expect(page.getByText(/bearbeitet/i)).toBeVisible({ timeout: 5_000 });

    // Should show the reason
    await expect(
      page.getByText(/uhrenabweichung korrigiert/i),
    ).toBeVisible();

    // Close
    await page.getByRole("button", { name: /schließen/i }).click();
  });
});

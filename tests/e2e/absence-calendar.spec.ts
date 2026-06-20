/**
 * Absence Calendar — E2E
 *
 * Verifies that vacation and sick absence indicators render correctly
 * inside the calendar cells.
 */

import { test, expect } from "@playwright/test";
import {
  testEmail,
  TEST_PASSWORD,
  cleanupTestUser,
  createTestUser,
  adminClient,
} from "./helpers";

test.describe("Absence calendar indicators", () => {
  const employeeEmail = testEmail("emp-cal");
  let tenantId: string;
  let employeeEmpId: string;

  test.beforeAll(async () => {
    const emp = await createTestUser({
      email: employeeEmail,
      password: TEST_PASSWORD,
      firstName: "Clara",
      lastName: "Kalender",
      companyName: "Kalender Test GmbH",
      role: "employee",
      bundesland: "nordrhein-westfalen",
    });
    tenantId = emp.tenantId;

    const { data: empRecord } = await adminClient
      .from("employees")
      .select("id")
      .eq("email", employeeEmail)
      .single();
    employeeEmpId = empRecord!.id;

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
    await adminClient.from("sick_entries").delete().eq("tenant_id", tenantId);
    await adminClient.from("leave_entitlements").delete().eq("tenant_id", tenantId);
    await adminClient.from("notifications").delete().eq("tenant_id", tenantId);
    await cleanupTestUser(employeeEmail);
  });

  async function loginAsEmployee(page: import("@playwright/test").Page) {
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(employeeEmail);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
  }

  test("vacation-only days show emerald indicator bar", async ({ page }) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const vacStart = `${year}-${month}-10`;
    const vacEnd = `${year}-${month}-12`;

    await adminClient.from("leave_requests").insert({
      tenant_id: tenantId,
      employee_id: employeeEmpId,
      type: "urlaub",
      start_date: vacStart,
      end_date: vacEnd,
      work_days_count: 3,
      status: "approved",
    });

    await loginAsEmployee(page);
    await page.goto("/app/vacation");
    await page.getByRole("tab", { name: /kalender/i }).click();
    await expect(page.locator('[data-slot="calendar"]')).toBeVisible({ timeout: 10_000 });

    // Find the gridcell for the 10th
    const gridcell = page.getByRole("gridcell", { name: new RegExp(`.*10\\.`) }).first();
    await expect(gridcell).toBeVisible({ timeout: 5_000 });

    // Should contain an emerald indicator bar (absolute positioned span with bg-emerald-400)
    const indicator = gridcell.locator("span.absolute");
    await expect(indicator).toBeVisible({ timeout: 5_000 });
    const classes = await indicator.getAttribute("class") ?? "";
    expect(classes).toContain("bg-emerald-400");
    expect(classes).not.toContain("bg-rose");
    expect(classes).not.toContain("from-emerald");
  });

  test("sick-only days show rose indicator bar", async ({ page }) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const sickStart = `${year}-${month}-20`;
    const sickEnd = `${year}-${month}-21`;

    await adminClient.from("sick_entries").insert({
      tenant_id: tenantId,
      employee_id: employeeEmpId,
      start_date: sickStart,
      end_date: sickEnd,
      work_days_count: 2,
      created_by: employeeEmpId,
    });

    await loginAsEmployee(page);
    await page.goto("/app/sick");
    await page.getByRole("tab", { name: /kalender/i }).click();
    await expect(page.locator('[data-slot="calendar"]')).toBeVisible({ timeout: 10_000 });

    const gridcell = page.getByRole("gridcell", { name: new RegExp(`.*20\\.`) }).first();
    await expect(gridcell).toBeVisible({ timeout: 5_000 });

    const indicator = gridcell.locator("span.absolute");
    await expect(indicator).toBeVisible({ timeout: 5_000 });
    const classes = await indicator.getAttribute("class") ?? "";
    expect(classes).toContain("bg-rose-400");
    expect(classes).not.toContain("bg-emerald");
  });

  test("vacation + sick on same day shows gradient bar", async ({ page }) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const overlapDate = `${year}-${month}-25`;

    await adminClient.from("leave_requests").insert({
      tenant_id: tenantId,
      employee_id: employeeEmpId,
      type: "urlaub",
      start_date: overlapDate,
      end_date: overlapDate,
      work_days_count: 1,
      status: "approved",
    });

    await adminClient.from("sick_entries").insert({
      tenant_id: tenantId,
      employee_id: employeeEmpId,
      start_date: overlapDate,
      end_date: overlapDate,
      work_days_count: 1,
      created_by: employeeEmpId,
    });

    await loginAsEmployee(page);
    await page.goto("/app/vacation");
    await page.getByRole("tab", { name: /kalender/i }).click();
    await expect(page.locator('[data-slot="calendar"]')).toBeVisible({ timeout: 10_000 });

    const gridcell = page.getByRole("gridcell", { name: new RegExp(`.*25\\.`) }).first();
    await expect(gridcell).toBeVisible({ timeout: 5_000 });

    const indicator = gridcell.locator("span.absolute");
    await expect(indicator).toBeVisible({ timeout: 5_000 });
    const classes = await indicator.getAttribute("class") ?? "";
    expect(classes).toContain("from-emerald-400");
    expect(classes).toContain("to-rose-400");
  });

  test("days without absences have no indicator bar", async ({ page }) => {
    await loginAsEmployee(page);
    await page.goto("/app/vacation");
    await page.getByRole("tab", { name: /kalender/i }).click();
    await expect(page.locator('[data-slot="calendar"]')).toBeVisible({ timeout: 10_000 });

    // Day 1 — no absence data
    const gridcell = page.getByRole("gridcell", { name: /1\./ }).first();
    await expect(gridcell).toBeVisible({ timeout: 5_000 });

    const indicator = gridcell.locator("span.absolute");
    await expect(indicator).not.toBeVisible({ timeout: 2_000 });
  });

  test("legend shows Urlaub and Krank without Beides", async ({ page }) => {
    await loginAsEmployee(page);
    await page.goto("/app/vacation");
    await page.getByRole("tab", { name: /kalender/i }).click();
    await expect(page.locator('[data-slot="calendar"]')).toBeVisible({ timeout: 10_000 });

    const calendarPanel = page.getByRole("tabpanel", { name: /kalender/i });
    await expect(calendarPanel.getByText("Urlaub")).toBeVisible({ timeout: 5_000 });
    await expect(calendarPanel.getByText("Krank")).toBeVisible({ timeout: 5_000 });
    await expect(calendarPanel.getByText("Beides")).not.toBeVisible();
  });
});

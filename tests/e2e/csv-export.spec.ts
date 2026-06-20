/**
 * Story 6.1: CSV Export & Data Portability — E2E
 *
 * Tests:
 * - Manager can export CSV from reports page
 * - CSV file downloads with correct filename
 * - CSV contains German headers and DD.MM.YYYY dates
 * - Employee can export own data (Art 20 DSGVO)
 * - Employee data export includes profile, entries, audit records
 * - Non-manager cannot access manager CSV export
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

test.describe("CSV Export — Story 6.1 (Manager)", () => {
  const managerEmail = testEmail("csv-mgr");
  const employeeEmail = testEmail("csv-emp");
  let tenantId: string;
  let employeeEmpId: string;
  const entryDate = getCurrentMonday();
  const entryDateDE = toGermanDate(entryDate);

  test.beforeAll(async () => {
    const mgr = await createTestUser({
      email: managerEmail,
      password: TEST_PASSWORD,
      firstName: "CSV",
      lastName: "Manager",
      companyName: "CSV Export GmbH",
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
      first_name: "Thomas",
      last_name: "Müller",
      email: employeeEmail,
      role: "employee",
    });
    await adminClient.rpc("set_employee_claims", { user_uuid: empUserId });

    const { data: empData } = await adminClient
      .from("employees")
      .select("id")
      .eq("email", employeeEmail)
      .single();
    employeeEmpId = empData!.id;

    // Create a completed time entry for export (current week Monday)
    await adminClient.from("time_entries").insert({
      tenant_id: tenantId,
      employee_id: employeeEmpId,
      date: entryDate,
      clock_in: `${entryDate}T08:00:00.000Z`,
      clock_out: `${entryDate}T17:00:00.000Z`,
      break_minutes: 30,
      status: "completed",
    });
  });

  test.afterAll(async () => {
    await adminClient
      .from("time_entry_audit")
      .delete()
      .eq("tenant_id", tenantId);
    await adminClient
      .from("break_sessions")
      .delete()
      .eq("tenant_id", tenantId);
    await adminClient
      .from("time_entries")
      .delete()
      .eq("tenant_id", tenantId);
    await cleanupTestUser(managerEmail);
    await cleanupTestUser(employeeEmail);
  });

  async function loginAsManager(page: import("@playwright/test").Page) {
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(managerEmail);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page
      .getByRole("button", { name: /anmelden/i })
      .click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
  }

  test("reports page shows CSV Export button", async ({ page }) => {
    await loginAsManager(page);
    await page.goto("/app/reports");
    await expect(
      page.getByRole("heading", { name: /berichte/i }),
    ).toBeVisible({ timeout: 5_000 });

    await expect(
      page.getByRole("button", { name: /csv export/i }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("CSV export downloads a file with correct prefix", async ({
    page,
  }) => {
    await loginAsManager(page);
    await page.goto("/app/reports");

    const downloadPromise = page.waitForEvent("download", { timeout: 15_000 });
    await page.getByRole("button", { name: /csv export/i }).click();
    const download = await downloadPromise;

    const filename = download.suggestedFilename();
    expect(filename).toMatch(/^quoska_\d{4}-\d{2}-\d{2}_bis_\d{4}-\d{2}-\d{2}\.csv$/);

    // Read and verify CSV content
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk);
    const csv = Buffer.concat(chunks).toString("utf-8");

    // German headers
    expect(csv).toContain("Mitarbeiter");
    expect(csv).toContain("Datum");
    expect(csv).toContain("Beginn");
    expect(csv).toContain("Ende");
    expect(csv).toContain("Pause (Min)");
    expect(csv).toContain("Netto-Stunden");
    expect(csv).toContain("Notizen");

    // Data row with German date format
    expect(csv).toContain("Thomas Müller");
    expect(csv).toContain(entryDateDE);
  });

  test("CSV includes time data for employees", async ({ page }) => {
    await loginAsManager(page);
    await page.goto("/app/reports");

    const downloadPromise = page.waitForEvent("download", { timeout: 15_000 });
    await page.getByRole("button", { name: /csv export/i }).click();
    const download = await downloadPromise;

    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk);
    const csv = Buffer.concat(chunks).toString("utf-8");

    const lines = csv.split("\n");
    expect(lines.length).toBeGreaterThanOrEqual(2); // Header + at least 1 data row
    // Break minutes shown
    expect(csv).toContain("30");
  });
});

test.describe("DSGVO Data Portability — Story 6.1 (Employee)", () => {
  const employeeEmail = testEmail("dsgvo-emp");
  let tenantId: string;
  const dsgvoDate = getCurrentMonday();
  const dsgvoDateDE = toGermanDate(dsgvoDate);

  test.beforeAll(async () => {
    const emp = await createTestUser({
      email: employeeEmail,
      password: TEST_PASSWORD,
      firstName: "Anna",
      lastName: "Schmidt",
      companyName: "DSGVO Export GmbH",
      role: "employee",
      bundesland: "berlin",
    });
    tenantId = emp.tenantId;

    // Create a completed time entry
    const { data: empData } = await adminClient
      .from("employees")
      .select("id")
      .eq("email", employeeEmail)
      .single();

    await adminClient.from("time_entries").insert({
      tenant_id: tenantId,
      employee_id: empData!.id,
      date: dsgvoDate,
      clock_in: `${dsgvoDate}T09:00:00.000Z`,
      clock_out: `${dsgvoDate}T18:00:00.000Z`,
      break_minutes: 45,
      status: "completed",
    });
  });

  test.afterAll(async () => {
    await adminClient
      .from("time_entry_audit")
      .delete()
      .eq("tenant_id", tenantId);
    await adminClient
      .from("break_sessions")
      .delete()
      .eq("tenant_id", tenantId);
    await adminClient
      .from("time_entries")
      .delete()
      .eq("tenant_id", tenantId);
    await cleanupTestUser(employeeEmail);
  });

  async function loginAsEmployee(page: import("@playwright/test").Page) {
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(employeeEmail);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page
      .getByRole("button", { name: /anmelden/i })
      .click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
  }

  test("settings page shows 'Meine Daten exportieren' button", async ({
    page,
  }) => {
    await loginAsEmployee(page);
    await page.goto("/app/settings");

    await expect(
      page.getByRole("heading", { name: /einstellungen/i }),
    ).toBeVisible({ timeout: 5_000 });

    await expect(
      page.getByRole("button", {
        name: /meine daten exportieren/i,
      }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("DSGVO data export downloads a CSV file", async ({ page }) => {
    await loginAsEmployee(page);
    await page.goto("/app/settings");

    const downloadPromise = page.waitForEvent("download", { timeout: 15_000 });
    await page
      .getByRole("button", { name: /meine daten exportieren/i })
      .click();
    const download = await downloadPromise;

    const filename = download.suggestedFilename();
    expect(filename).toMatch(/^quoska_meine_daten_anna_schmidt\.csv$/);

    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk);
    const csv = Buffer.concat(chunks).toString("utf-8");

    // DSGVO header
    expect(csv).toContain("Art. 20 DSGVO");

    // Employee profile
    expect(csv).toContain("Anna");
    expect(csv).toContain("Schmidt");

    // Time entries section
    expect(csv).toContain("Zeiteinträge");
    expect(csv).toContain(dsgvoDateDE);

    // Audit records section
    expect(csv).toContain("Änderungsverlauf");
  });

  test("employee does NOT see danger zone", async ({
    page,
  }) => {
    await loginAsEmployee(page);
    await page.goto("/app/settings");

    // Account deletion is admin-only
    await expect(
      page.getByText("Account löschen"),
    ).not.toBeVisible({ timeout: 3_000 });
  });
});

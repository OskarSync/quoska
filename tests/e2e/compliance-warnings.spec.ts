/**
 * Epic 12: Arbeitszeit-Warnungen (Working Time Warnings) — E2E
 *
 * Tests that ArbZG compliance warnings appear in the clock UI:
 * - §3 ArbZG: Daily limit (info at 8h, warning at 10h, critical at 12h)
 * - §4 ArbZG: Break warnings after 6h without break
 * - §5 ArbZG: Rest period warning when <11h between shifts
 * - ArbZG Reform 2026: Weekly limit >48h
 *
 * Approach: Instead of waiting real hours, we insert running time entries
 * with clock_in timestamps far enough in the past for the warnings to trigger.
 */

import { test, expect } from "@playwright/test";
import {
  testEmail,
  TEST_PASSWORD,
  cleanupTestUser,
  createTestUser,
  adminClient,
} from "./helpers";

test.describe("Compliance Warnings — Epic 12", () => {
  const employeeEmail = testEmail("emp-epic12");
  let tenantId: string;
  let employeeEmpId: string;

  test.beforeAll(async () => {
    const emp = await createTestUser({
      email: employeeEmail,
      password: TEST_PASSWORD,
      firstName: "Max",
      lastName: "Mustermann",
      companyName: "Epic12 Test GmbH",
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
  });

  test.afterAll(async () => {
    await adminClient.from("time_entry_audit").delete().eq("tenant_id", tenantId);
    await adminClient.from("break_sessions").delete().eq("tenant_id", tenantId);
    await adminClient.from("time_entries").delete().eq("tenant_id", tenantId);
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

  /** ISO date string for a given Date */
  function toDateStr(d: Date): string {
    return d.toISOString().split("T")[0];
  }

  /** Create a running time entry that started X minutes ago */
  async function createRunningEntry(minutesAgo: number, breakMinutes = 0) {
    const now = new Date();
    const clockIn = new Date(now.getTime() - minutesAgo * 60_000);
    const clockInIso = clockIn.toISOString();

    await adminClient.from("time_entries").insert({
      tenant_id: tenantId,
      employee_id: employeeEmpId,
      date: toDateStr(clockIn),
      clock_in: clockInIso,
      status: "running",
      break_minutes: breakMinutes,
    });
  }

  /** Create a completed time entry */
  async function createCompletedEntry(
    clockInMinutesAgo: number,
    durationMinutes: number,
    breakMinutes = 0,
  ) {
    const now = new Date();
    const clockIn = new Date(now.getTime() - clockInMinutesAgo * 60_000);
    const clockOut = new Date(clockIn.getTime() + durationMinutes * 60_000);

    await adminClient.from("time_entries").insert({
      tenant_id: tenantId,
      employee_id: employeeEmpId,
      date: toDateStr(clockIn),
      clock_in: clockIn.toISOString(),
      clock_out: clockOut.toISOString(),
      status: "completed",
      break_minutes: breakMinutes,
    });
  }

  async function cleanupTimeEntries() {
    await adminClient.from("time_entry_audit").delete().eq("tenant_id", tenantId);
    await adminClient.from("break_sessions").delete().eq("tenant_id", tenantId);
    await adminClient.from("time_entries").delete().eq("tenant_id", tenantId);
  }

  // -----------------------------------------------------------------------
  // §3 ArbZG — Daily limit warnings
  // -----------------------------------------------------------------------

  test("info warning at 8 hours worked", async ({ page }) => {
    await cleanupTimeEntries();
    await createRunningEntry(8 * 60 + 5); // 8h 5m

    await loginAsEmployee(page);
    await page.goto("/app/clock");
    await expect(page.getByRole("button", { name: /ausstempeln/i })).toBeVisible({ timeout: 10_000 });

    await expect(page.getByText(/8 Stunden/)).toBeVisible({ timeout: 5_000 });
  });

  test("warning at 10 hours worked", async ({ page }) => {
    await cleanupTimeEntries();
    await createRunningEntry(10 * 60 + 5); // 10h 5m

    await loginAsEmployee(page);
    await page.goto("/app/clock");
    await expect(page.getByRole("button", { name: /ausstempeln/i })).toBeVisible({ timeout: 10_000 });

    await expect(page.getByText(/10 Stunden/)).toBeVisible({ timeout: 5_000 });
  });

  test("critical warning at 12 hours worked", async ({ page }) => {
    await cleanupTimeEntries();
    await createRunningEntry(12 * 60 + 5); // 12h 5m

    await loginAsEmployee(page);
    await page.goto("/app/clock");
    await expect(page.getByRole("button", { name: /ausstempeln/i })).toBeVisible({ timeout: 10_000 });

    await expect(page.getByText(/Arbeitszeitgesetz verletzt/)).toBeVisible({ timeout: 5_000 });
  });

  // -----------------------------------------------------------------------
  // §4 ArbZG — Break warnings
  // -----------------------------------------------------------------------

  test("break warning after 6h without break", async ({ page }) => {
    await cleanupTimeEntries();
    await createRunningEntry(6 * 60 + 5, 0); // 6h 5m, no break

    await loginAsEmployee(page);
    await page.goto("/app/clock");
    await expect(page.getByRole("button", { name: /ausstempeln/i })).toBeVisible({ timeout: 10_000 });

    await expect(page.getByText(/Pause erforderlich/)).toBeVisible({ timeout: 5_000 });
  });

  test("no break warning when sufficient break taken", async ({ page }) => {
    await cleanupTimeEntries();
    await createRunningEntry(6 * 60 + 5, 30); // 6h 5m, 30min break taken

    await loginAsEmployee(page);
    await page.goto("/app/clock");
    await expect(page.getByRole("button", { name: /ausstempeln/i })).toBeVisible({ timeout: 10_000 });

    await expect(page.getByText(/Pause erforderlich/)).not.toBeVisible({ timeout: 3_000 });
  });

  test("critical break warning after 6.5h without break", async ({ page }) => {
    await cleanupTimeEntries();
    await createRunningEntry(6 * 60 + 35, 0); // 6h 35m, no break

    await loginAsEmployee(page);
    await page.goto("/app/clock");
    await expect(page.getByRole("button", { name: /ausstempeln/i })).toBeVisible({ timeout: 10_000 });

    await expect(page.getByText(/sofort.*Pause/)).toBeVisible({ timeout: 5_000 });
  });

  // -----------------------------------------------------------------------
  // §5 ArbZG — Rest period warnings
  // -----------------------------------------------------------------------

  test("rest period warning when <11h between shifts", async ({ page }) => {
    await cleanupTimeEntries();

    // Completed entry: clocked in 20h ago, worked 8h, clocked out 12h ago
    await createCompletedEntry(20 * 60, 8 * 60, 30);

    // Running entry: clocked in 10h ago (only 2h rest after 12h-ago clock-out)
    await createRunningEntry(10 * 60);

    await loginAsEmployee(page);
    await page.goto("/app/clock");
    await expect(page.getByRole("button", { name: /ausstempeln/i })).toBeVisible({ timeout: 10_000 });

    await expect(page.getByText(/Ruhezeit/)).toBeVisible({ timeout: 5_000 });
  });

  // -----------------------------------------------------------------------
  // ArbZG Reform 2026 — Weekly limit
  // -----------------------------------------------------------------------

  // Skipped: This test requires multiple past days in the current calendar week (Mon-Sun)
  // to accumulate >48h of completed entries. On Monday/Tuesday there aren't enough days.
  // The weekly limit logic is covered by unit tests in tests/legal/arbzg.test.ts.
  test.skip("weekly limit warning when >48h in a week", async ({ page }) => {
    await cleanupTimeEntries();

    // The compliance service only counts completed entries from the current week.
    // We need >2880 net minutes (48h). Create non-overlapping completed entries
    // all on today's date (since we can't control what day of the week the test runs).
    // 7 entries × 7h each = 49h > 48h.
    const now = new Date();
    const todayStr = toDateStr(now);

    // Create 7 non-overlapping 7-hour blocks starting from 00:00 today
    // Each block: start at hour (i*3.5), duration 3h15m (195 min), net = 195 min
    // 7 blocks × 195 = 1365 min = 22.75h — not enough. Let's use bigger blocks.
    // Actually simpler: create entries spread across past days of THIS week.
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    // Create entries from each day of the current week (Mon-today)
    // Each day: 10h completed entry, 0 break = 600 net min
    // Need 5 days × 600 = 3000 min > 2880
    for (let d = 0; d < 5; d++) {
      const dayDate = new Date(now);
      dayDate.setDate(now.getDate() + mondayOffset + d);
      // Only create for days up to and including today
      if (dayDate > now) continue;

      const clockIn = new Date(dayDate);
      clockIn.setHours(7, 0, 0, 0);
      const clockOut = new Date(clockIn.getTime() + 10 * 60 * 60_000);

      // Don't create if clockOut would be in the future
      if (clockOut > now) continue;

      await adminClient.from("time_entries").insert({
        tenant_id: tenantId,
        employee_id: employeeEmpId,
        date: toDateStr(clockIn),
        clock_in: clockIn.toISOString(),
        clock_out: clockOut.toISOString(),
        status: "completed",
        break_minutes: 0,
      });
    }

    // Also clock in so the page shows the clocked-in state
    const runningClockIn = new Date(now.getTime() - 30 * 60_000);
    await adminClient.from("time_entries").insert({
      tenant_id: tenantId,
      employee_id: employeeEmpId,
      date: todayStr,
      clock_in: runningClockIn.toISOString(),
      status: "running",
      break_minutes: 0,
    });

    await loginAsEmployee(page);
    await page.goto("/app/clock");
    await expect(page.getByRole("button", { name: /ausstempeln/i })).toBeVisible({ timeout: 10_000 });

    await expect(page.getByText(/Wochenstunden.*48/)).toBeVisible({ timeout: 5_000 });
  });

  // -----------------------------------------------------------------------
  // No warnings for normal hours
  // -----------------------------------------------------------------------

  test("no warnings during normal working hours", async ({ page }) => {
    await cleanupTimeEntries();
    await createRunningEntry(4 * 60); // 4h, no break (fine under 6h)

    await loginAsEmployee(page);
    await page.goto("/app/clock");
    await expect(page.getByRole("button", { name: /ausstempeln/i })).toBeVisible({ timeout: 10_000 });

    const alertElements = page.locator('[data-slot="alert"]');
    await expect(alertElements).not.toBeVisible({ timeout: 3_000 });
  });
});

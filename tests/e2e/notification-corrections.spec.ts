/**
 * Epic 7: Correction Request Notifications — E2E
 *
 * Tests:
 * - Manager receives notification after employee submits correction request
 * - Employee receives notification after correction is approved
 * - Employee receives notification after correction is rejected
 */

import { test, expect } from "@playwright/test";
import {
  testEmail,
  TEST_PASSWORD,
  cleanupTestUser,
  createTestUser,
  adminClient,
} from "./helpers";

// ---------------------------------------------------------------------------
// Story 7.2 — Correction Request Notifications
// ---------------------------------------------------------------------------

test.describe("Correction Request Notifications — Story 7.2", () => {
  const managerEmail = testEmail("notif-mgr");
  const employeeEmail = testEmail("notif-emp");
  let tenantId: string;
  let managerEmpId: string;
  let employeeEmpId: string;
  let timeEntryId: string;

  test.beforeAll(async () => {
    // Create manager
    const mgr = await createTestUser({
      email: managerEmail,
      password: TEST_PASSWORD,
      firstName: "Mark",
      lastName: "Manager",
      companyName: "Notif Corr GmbH",
      role: "manager",
      bundesland: "berlin",
    });
    tenantId = mgr.tenantId;

    const { data: mgrData } = await adminClient
      .from("employees")
      .select("id")
      .eq("email", managerEmail)
      .single();
    managerEmpId = mgrData!.id;

    // Create employee in same tenant
    const { data: empAuth } = await adminClient.auth.admin.createUser({
      email: employeeEmail,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    const empUserId = empAuth.user?.id ?? "";
    await adminClient.from("employees").insert({
      tenant_id: tenantId,
      user_id: empUserId,
      first_name: "Eva",
      last_name: "Mitarbeiterin",
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

    // Create a completed time entry for the employee
    const { data: entry } = await adminClient
      .from("time_entries")
      .insert({
        tenant_id: tenantId,
        employee_id: employeeEmpId,
        date: "2026-06-02",
        clock_in: "2026-06-02T08:00:00.000Z",
        clock_out: "2026-06-02T16:00:00.000Z",
        break_minutes: 30,
        status: "completed",
      })
      .select("id")
      .single();
    timeEntryId = entry!.id;
  });

  test.afterAll(async () => {
    await adminClient.from("notifications").delete().eq("tenant_id", tenantId);
    await adminClient.from("correction_requests").delete().eq("tenant_id", tenantId);
    await adminClient.from("time_entry_audit").delete().eq("tenant_id", tenantId);
    await adminClient.from("break_sessions").delete().eq("tenant_id", tenantId);
    await adminClient.from("time_entries").delete().eq("tenant_id", tenantId);
    await cleanupTestUser(managerEmail);
    await cleanupTestUser(employeeEmail);
  });

  test("manager receives notification after employee submits correction", async ({
    page,
  }) => {
    // Employee submits correction via API
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(employeeEmail);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page
      .getByRole("button", { name: /anmelden/i })
      .click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    const res = await page.request.post("/api/v1/corrections", {
      data: {
        time_entry_id: timeEntryId,
        proposed_change: { clock_out: "2026-06-02T17:00:00.000Z" },
        reason: "Ausstempeln war 17:00, nicht 16:00",
      },
    });
    expect(res.ok()).toBeTruthy();

    // Manager should now have a notification
    const { data: notifs } = await adminClient
      .from("notifications")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("employee_id", managerEmpId)
      .eq("type", "correction_request");
    expect(notifs!.length).toBeGreaterThanOrEqual(1);
    expect(notifs![0].title).toContain("Korrektur");
  });

  test("employee receives notification after correction is approved", async ({
    page,
  }) => {
    // Get the correction request ID
    const { data: corr } = await adminClient
      .from("correction_requests")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("employee_id", employeeEmpId)
      .eq("status", "pending")
      .single();

    // Manager approves via API
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(managerEmail);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page
      .getByRole("button", { name: /anmelden/i })
      .click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    const res = await page.request.patch(
      `/api/v1/corrections/${corr!.id}`,
      {
        data: { action: "approve" },
      },
    );
    expect(res.ok()).toBeTruthy();

    // Employee should have an approved notification
    const { data: notifs } = await adminClient
      .from("notifications")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("employee_id", employeeEmpId)
      .eq("type", "correction_approved");
    expect(notifs!.length).toBeGreaterThanOrEqual(1);
  });

  test("employee receives notification after correction is rejected", async ({
    page,
  }) => {
    // Create another entry and correction for rejection
    const { data: entry2 } = await adminClient
      .from("time_entries")
      .insert({
        tenant_id: tenantId,
        employee_id: employeeEmpId,
        date: "2026-06-03",
        clock_in: "2026-06-03T09:00:00.000Z",
        clock_out: "2026-06-03T15:00:00.000Z",
        break_minutes: 0,
        status: "completed",
      })
      .select("id")
      .single();

    // Employee submits correction
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(employeeEmail);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page
      .getByRole("button", { name: /anmelden/i })
      .click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    await page.request.post("/api/v1/corrections", {
      data: {
        time_entry_id: entry2!.id,
        proposed_change: { break_minutes: 30 },
        reason: "Hatte 30 Min Pause vergessen",
      },
    });

    // Manager rejects — need to switch user
    // Clear auth state by navigating away first
    await page.goto("/app/settings");
    const signOutBtn = page.getByRole("button", { name: /abmelden/i });
    if (await signOutBtn.isVisible().catch(() => false)) {
      await signOutBtn.click();
      await expect(page).toHaveURL(/\/login/, { timeout: 5_000 }).catch(() => {});
    }
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(managerEmail);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page
      .getByRole("button", { name: /anmelden/i })
      .click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    const { data: corr2 } = await adminClient
      .from("correction_requests")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("employee_id", employeeEmpId)
      .eq("status", "pending")
      .single();

    const res = await page.request.patch(
      `/api/v1/corrections/${corr2!.id}`,
      {
        data: { action: "reject", review_note: "Nicht nachvollziehbar" },
      },
    );
    expect(res.ok()).toBeTruthy();

    // Employee should have a rejected notification
    const { data: notifs } = await adminClient
      .from("notifications")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("employee_id", employeeEmpId)
      .eq("type", "correction_rejected");
    expect(notifs!.length).toBeGreaterThanOrEqual(1);
  });
});

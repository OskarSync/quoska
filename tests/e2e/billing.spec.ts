/**
 * Epic 8: Stripe Billing (open-source pattern) — E2E
 *
 * Proves the open-source/self-host vs hosted billing model:
 *
 * 1. NO-KEYS MODE (default dev/self-host build):
 *    - /api/v1/billing/status reports canUpgrade=false (billing UI hidden).
 *    - The settings page renders NO "Abrechnung" section.
 *    - The app works fully and the free-tier 3-employee limit is enforced.
 *
 * 2. PLAN ENFORCEMENT (what webhooks ultimately drive):
 *    - A tenant on `pro` can exceed the 3-employee free limit.
 *    - /api/v1/billing/status reflects the stored plan.
 *
 * The webhook event → plan-write logic is covered by unit tests
 * (tests/services/subscriptionService.test.ts). These e2e tests cover the
 * user-visible enforcement that the webhook output gates.
 */

import { test, expect, type Page } from "@playwright/test";
import {
  testEmail,
  TEST_PASSWORD,
  cleanupTestUser,
  createTestUser,
  adminClient,
} from "./helpers";

test.describe("Billing — Open-Source Pattern (Story 8.1/8.2)", () => {
  const adminEmail = testEmail("bill-admin");
  let tenantId: string;
  let adminEmpId: string;

  test.beforeAll(async () => {
    const admin = await createTestUser({
      email: adminEmail,
      password: TEST_PASSWORD,
      firstName: "Bianca",
      lastName: "Buchhaltung",
      companyName: "Billing Test GmbH",
      role: "admin",
      bundesland: "berlin",
    });
    tenantId = admin.tenantId;

    const { data: emp } = await adminClient
      .from("employees")
      .select("id")
      .eq("email", adminEmail)
      .single();
    adminEmpId = emp!.id;
  });

  test.afterAll(async () => {
    await cleanupTestUser(adminEmail);
  });

  async function clearExtraEmployees() {
    // Keep only the admin employee; remove any extras created by tests.
    await adminClient
      .from("employees")
      .delete()
      .eq("tenant_id", tenantId)
      .neq("id", adminEmpId);
    // Reset plan to free between tests.
    await adminClient.from("tenants").update({ plan: "free" }).eq("id", tenantId);
  }

  async function loginAsAdmin(page: Page) {
    await page.goto("/login");
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(adminEmail);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
  }

  // ---------------------------------------------------------------------
  // No-keys mode (self-host / open-source build)
  // ---------------------------------------------------------------------

  test("billing status API reports billing not upgradeable in no-keys build", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    const res = await page.request.get("/api/v1/billing/status");
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    // In the dev/self-host env no Stripe publishable key + price are set.
    expect(json.data.canUpgrade).toBe(false);
    expect(json.data.plan).toBe("free");
    expect(json.data.freeLimit).toBe(3);
  });

  test("settings page hides the Abrechnung section when billing is disabled", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto("/app/settings");

    // Page loads normally...
    await expect(
      page.getByRole("heading", { name: /einstellungen/i }),
    ).toBeVisible({ timeout: 5_000 });
    // ...but no billing card is rendered (no Stripe keys configured).
    await expect(page.getByRole("heading", { name: /abrechnung/i })).toHaveCount(0);
  });

  // ---------------------------------------------------------------------
  // Plan enforcement (the output webhooks drive)
  // ---------------------------------------------------------------------

  test("free plan blocks inviting a 4th employee", async ({ page }) => {
    await clearExtraEmployees();

    // Add 2 extra employees so the tenant has 3 total (the free limit).
    for (const first of ["Fritz", "Franz"]) {
      const { data: auth } = await adminClient.auth.admin.createUser({
        email: testEmail(`bill-${first}`),
        password: TEST_PASSWORD,
        email_confirm: true,
      });
      await adminClient.from("employees").insert({
        tenant_id: tenantId,
        user_id: auth.user!.id,
        first_name: first,
        last_name: "Frei",
        email: testEmail(`bill-${first}`),
        role: "employee",
      });
      await adminClient.rpc("set_employee_claims", { user_uuid: auth.user!.id });
    }

    // The plan limit status now reports the tenant is at the free limit.
    await loginAsAdmin(page);
    const res = await page.request.get("/api/v1/employees");
    const json = await res.json();
    expect(json.data.planStatus.limit).toBe(3);
    expect(json.data.planStatus.canAddMore).toBe(false);
    expect(json.data.active.length).toBe(3);
  });

  test("pro plan lifts the employee limit", async ({ page }) => {
    await clearExtraEmployees();

    // Simulate a Stripe webhook having upgraded the tenant to Pro.
    await adminClient.from("tenants").update({ plan: "pro" }).eq("id", tenantId);

    await loginAsAdmin(page);
    const res = await page.request.get("/api/v1/employees");
    const json = await res.json();
    expect(json.data.planStatus.plan).toBe("pro");
    // Pro → unlimited (limit is null), so canAddMore is true.
    expect(json.data.planStatus.limit).toBeNull();
    expect(json.data.planStatus.canAddMore).toBe(true);

    // billing/status now reports pro with no free limit.
    const status = await page.request.get("/api/v1/billing/status");
    const statusJson = await status.json();
    expect(statusJson.data.plan).toBe("pro");
    expect(statusJson.data.freeLimit).toBeNull();
  });
});

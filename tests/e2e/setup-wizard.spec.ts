/**
 * Story 1.4: Tenant Setup Wizard
 */

import { test, expect } from "@playwright/test";
import { testEmail, TEST_PASSWORD, cleanupTestUser, adminClient } from "./helpers";

test.describe("Setup Wizard", () => {
  test("full setup wizard flow: register → setup → dashboard", async ({ page }) => {
    const email = testEmail("setup");

    // Register
    await page.goto("/register");
    await page.getByLabel("Firmenname").fill("Setup Wizard GmbH");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /registrieren/i }).click();
    await expect(page).toHaveURL(/\/setup/, { timeout: 15_000 });

    // Step 1: Company
    await expect(page.getByText(/1\. Firma/)).toBeVisible();
    await page.getByLabel("Firmenname").fill("Setup Wizard GmbH");
    // Custom Select component (not native <select>) — use click-based interaction
    await page.getByLabel("Bundesland").click();
    await page.getByRole("option", { name: /nordrhein-westfalen/i }).click();
    await page.getByRole("button", { name: /weiter/i }).click();

    // Step 2: Invite
    await expect(page.getByText(/lade dein team/i)).toBeVisible();
    await page.getByPlaceholder("Vorname").first().fill("Max");
    await page.getByPlaceholder("Nachname").first().fill("Mustermann");
    await page.getByPlaceholder("E-Mail").first().fill(testEmail("invite1"));
    await page.getByRole("button", { name: /einladen/i }).click();

    // Step 3: Done
    await expect(page.getByText("Fertig!")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /dashboard/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    // Verify in DB
    const { data: employees } = await adminClient
      .from("employees")
      .select("tenant_id, tenants(setup_complete)")
      .eq("email", email)
      .is("deleted_at", null);
    expect(employees).toHaveLength(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((employees![0].tenants as any).setup_complete).toBe(true);

    await cleanupTestUser(email);
  });

  test("setup validates bundesland is required", async ({ page }) => {
    const email = testEmail("valsetup");

    await page.goto("/register");
    await page.getByLabel("Firmenname").fill("Validation Co");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /registrieren/i }).click();
    await expect(page).toHaveURL(/\/setup/, { timeout: 15_000 });

    // Don't select bundesland
    await page.getByLabel("Firmenname").fill("Validation Co");
    await page.getByRole("button", { name: /weiter/i }).click();

    await expect(
      page.getByText(/bundesland ist erforderlich|erforderlich/i),
    ).toBeVisible({ timeout: 5_000 });

    await cleanupTestUser(email);
  });

  test("setup shows free plan limit text", async ({ page }) => {
    const email = testEmail("limit");

    await page.goto("/register");
    await page.getByLabel("Firmenname").fill("Limit Co");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /registrieren/i }).click();
    await expect(page).toHaveURL(/\/setup/, { timeout: 15_000 });

    // Go to step 2
    await page.getByLabel("Firmenname").fill("Limit Co");
    // Custom Select component (not native <select>) — use click-based interaction
    await page.getByLabel("Bundesland").click();
    await page.getByRole("option", { name: /bayern/i }).click();
    await page.getByRole("button", { name: /weiter/i }).click();

    await expect(page.getByText(/max.*2 weitere/i)).toBeVisible();

    await cleanupTestUser(email);
  });
});

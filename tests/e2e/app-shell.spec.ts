/**
 * Story 1.5: App Shell — Layout, Navigation & PWA
 */

import { test, expect } from "@playwright/test";
import { testEmail, TEST_PASSWORD, cleanupTestUser, createTestUser } from "./helpers";

test.describe("App Shell — Admin Navigation", () => {
  const email = testEmail("nav");

  test.beforeAll(async () => {
    await createTestUser({
      email,
      password: TEST_PASSWORD,
      firstName: "Anna",
      lastName: "Admin",
      companyName: "Nav Test GmbH",
      role: "admin",
      bundesland: "berlin",
    });
  });

  test.afterAll(async () => {
    await cleanupTestUser(email);
  });

  test("admin sees all navigation items in sidebar", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    await expect(page.getByRole("link", { name: /stempeln/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /meine zeiten/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /benachrichtigungen/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /mitarbeiter/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /berichte/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /einstellungen/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /abmelden/i })).toBeVisible();
    await expect(page.getByText("Anna Admin")).toBeVisible();
  });

  test("dashboard shows welcome message and feature cards", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    await expect(page.getByRole("heading", { name: /willkommen bei quoska/i })).toBeVisible();
    // Admin/manager sees the ManagerDashboard (team status), not employee feature cards
    await expect(page.getByText(/team-übersicht/i)).toBeVisible();
  });
});

test.describe("App Shell — Employee Role", () => {
  const adminEmail = testEmail("empnav-admin");
  const employeeEmail = testEmail("empnav-employee");
  let tenantId: string;

  test.beforeAll(async () => {
    const admin = await createTestUser({
      email: adminEmail,
      password: TEST_PASSWORD,
      firstName: "Boss",
      lastName: "Admin",
      companyName: "Emp Nav Co",
      role: "admin",
    });
    tenantId = admin.tenantId;

    // Create employee in same tenant
    const { data: empAuth } = await (await import("./helpers")).adminClient.auth.admin.createUser({
      email: employeeEmail,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    await (await import("./helpers")).adminClient
      .from("employees")
      .insert({ tenant_id: tenantId, user_id: empAuth.user?.id, first_name: "Max", last_name: "Mitarbeiter", email: employeeEmail, role: "employee" });
    await (await import("./helpers")).adminClient.rpc("set_employee_claims", { user_uuid: empAuth.user?.id });
  });

  test.afterAll(async () => {
    await cleanupTestUser(adminEmail);
    await cleanupTestUser(employeeEmail);
  });

  test("employee does NOT see admin-only nav items", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(employeeEmail);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    // Employee sees clock/my-times links (sidebar + dashboard cards may duplicate)
    await expect(page.getByRole("link", { name: /stempeln/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /meine zeiten/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /mitarbeiter/i })).not.toBeVisible();
    await expect(page.getByRole("link", { name: /berichte/i })).not.toBeVisible();
    await expect(page.getByRole("link", { name: /einstellungen/i })).not.toBeVisible();
  });
});

test.describe("App Shell — Mobile Responsive", () => {
  const email = testEmail("mobile");

  test.beforeAll(async () => {
    await createTestUser({
      email,
      password: TEST_PASSWORD,
      firstName: "Mobile",
      lastName: "User",
      companyName: "Mobile Co",
      role: "admin",
    });
  });

  test.afterAll(async () => {
    await cleanupTestUser(email);
  });

  test("bottom nav appears on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    // Sidebar hidden on mobile
    const sidebar = page.locator("aside");
    await expect(sidebar).toBeHidden();

    // Bottom nav visible
    await expect(page.getByRole("link", { name: /stempeln/i }).first()).toBeVisible();
  });

  test("sidebar visible on desktop viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    const sidebar = page.locator("aside");
    await expect(sidebar).toBeVisible();
  });
});

test.describe("PWA", () => {
  test("manifest.json is valid", async ({ request }) => {
    const response = await request.get("/manifest.json");
    expect(response.ok()).toBeTruthy();
    const manifest = await response.json();
    expect(manifest.name).toBe("Quoska");
    expect(manifest.short_name).toBe("Quoska");
    expect(manifest.display).toBe("standalone");
    expect(manifest.lang).toBe("de");
    expect(manifest.theme_color).toBe("#2563eb");
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test("service worker file exists", async ({ request }) => {
    const response = await request.get("/sw.js");
    expect(response.ok()).toBeTruthy();
  });
});

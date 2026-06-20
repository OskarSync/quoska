/**
 * Story 1.3: Authentication — Register, Login, Logout
 */

import { test, expect } from "@playwright/test";
import { testEmail, TEST_PASSWORD, cleanupTestUser, createTestUser } from "./helpers";

test.describe("Authentication", () => {
  const email = testEmail("auth");
  const password = TEST_PASSWORD;
  const companyName = "Auth Test GmbH";

  test.afterAll(async () => {
    await cleanupTestUser(email);
  });

  test("register page loads with correct German text", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: /unternehmen registrieren/i })).toBeVisible();
    await expect(page.getByLabel("Firmenname")).toBeVisible();
    await expect(page.getByLabel("E-Mail")).toBeVisible();
    await expect(page.getByLabel("Passwort")).toBeVisible();
    await expect(page.getByRole("button", { name: /registrieren/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /anmelden/i })).toBeVisible();
  });

  test("can register a new company and redirect to setup", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Firmenname").fill(companyName);
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(password);
    await page.getByRole("button", { name: /registrieren/i }).click();

    await expect(page).toHaveURL(/\/setup/, { timeout: 15_000 });
    await expect(page.getByText("Einrichtung")).toBeVisible();
  });

  test("register shows validation errors for empty fields", async ({ page }) => {
    await page.goto("/register");
    await page.getByRole("button", { name: /registrieren/i }).click();

    // At least Firmenname error should show
    await expect(page.getByText("Firmenname ist erforderlich")).toBeVisible();
  });

  test("login page loads with German text", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel("E-Mail")).toBeVisible();
    await expect(page.getByLabel("Passwort")).toBeVisible();
    await expect(page.getByRole("button", { name: /anmelden/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /registrieren/i })).toBeVisible();
  });

  test("can log in with valid credentials and see dashboard", async ({ page }) => {
    // Create a fully set-up user first
    const loginEmail = testEmail("login");
    await createTestUser({
      email: loginEmail,
      password,
      firstName: "Login",
      lastName: "Tester",
      companyName: "Login Test Co",
    });

    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(loginEmail);
    await page.getByLabel("Passwort").fill(password);
    await page.getByRole("button", { name: /anmelden/i }).click();

    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: /willkommen/i })).toBeVisible();

    await cleanupTestUser(loginEmail);
  });

  test("login shows error for wrong password", async ({ page }) => {
    const wrongEmail = testEmail("wrong");
    await createTestUser({
      email: wrongEmail,
      password,
      firstName: "Wrong",
      lastName: "Pass",
      companyName: "Wrong Pass Co",
    });

    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(wrongEmail);
    await page.getByLabel("Passwort").fill("wrongpassword");
    await page.getByRole("button", { name: /anmelden/i }).click();

    // Generic error — no hint which field is wrong
    await expect(page.getByText(/falsch/i)).toBeVisible({ timeout: 5_000 });

    await cleanupTestUser(wrongEmail);
  });

  test("login shows error for non-existent user", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill("nonexistent@quoska.dev");
    await page.getByLabel("Passwort").fill("something123");
    await page.getByRole("button", { name: /anmelden/i }).click();

    await expect(page.getByText(/falsch/i)).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Middleware route protection", () => {
  test("unauthenticated /app/dashboard redirects to /login", async ({ page }) => {
    await page.goto("/app/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
  });

  test("unauthenticated /setup redirects to /login", async ({ page }) => {
    await page.goto("/setup");
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
  });

  test("redirect includes redirect param", async ({ page }) => {
    await page.goto("/app/dashboard");
    await expect(page).toHaveURL(/\/login\?redirect=/, { timeout: 5_000 });
  });
});

test.describe("Logout", () => {
  const email = testEmail("logout");

  test.beforeAll(async () => {
    await createTestUser({
      email,
      password: TEST_PASSWORD,
      firstName: "Logout",
      lastName: "Tester",
      companyName: "Logout Co",
    });
  });

  test.afterAll(async () => {
    await cleanupTestUser(email);
  });

  test("can log out via sidebar", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    await page.getByRole("button", { name: /abmelden/i }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });

    // Protected routes should now redirect
    await page.goto("/app/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});

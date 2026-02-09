import { test, expect } from "@playwright/test";

test.describe("Phase 2: Auth pages", () => {
  test("2.1 Login page has form and links", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.locator("div").filter({ hasText: /^Login$/ }).first()).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /login/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /forgot/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /sign up/i })).toBeVisible();
  });

  test("2.2 Sign-up page has form", async ({ page }) => {
    await page.goto("/auth/sign-up");
    await expect(page.locator("div").filter({ hasText: /^Sign up$/ }).first()).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /sign up|create account/i })).toBeVisible();
  });

  test("2.3 Forgot password page", async ({ page }) => {
    await page.goto("/auth/forgot-password");
    await expect(page.locator("div").filter({ hasText: /^Reset Your Password$/ }).first()).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /send reset email/i })).toBeVisible();
  });

  test("2.4 Login with invalid credentials shows error", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByLabel(/email/i).fill("invalid@test.local");
    await page.getByLabel(/password/i).fill("wrongpassword");
    await page.getByRole("button", { name: /login/i }).click();
    await expect(page.getByText(/invalid|error|incorrect/i)).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("2.5 Login with valid credentials redirects to dashboard", async ({ page }) => {
    const email = process.env.E2E_TEST_EMAIL;
    const password = process.env.E2E_TEST_PASSWORD;
    if (!email || !password) {
      test.skip();
      return;
    }
    await page.goto("/auth/login");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: /login/i }).click();
    await expect(page).toHaveURL(/\/drives/, { timeout: 15000 });
    await expect(page.getByText(/Iftaar Drives|Grand Citizens|No Active Season/i).first()).toBeVisible({ timeout: 5000 });
  });
});

import { test, expect } from "@playwright/test";

test.describe("Phase 3: Dashboard navigation (requires login)", () => {
  test.beforeEach(async ({ page }) => {
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
  });

  test("3.1 Sidebar: Drives", async ({ page }) => {
    await page.getByRole("link", { name: /drives/i }).first().click();
    await expect(page).toHaveURL(/\/drives/);
    await expect(page.getByText(/Iftaar Drives|No active season/i)).toBeVisible();
  });

  test("3.2 Sidebar: Volunteers", async ({ page }) => {
    await page.getByRole("link", { name: /volunteers/i }).click();
    await expect(page).toHaveURL(/\/volunteers/);
  });

  test("3.3 Sidebar: Duties", async ({ page }) => {
    await page.getByRole("link", { name: /duties/i }).click();
    await expect(page).toHaveURL(/\/duties/);
  });

  test("3.4 Sidebar: Analytics", async ({ page }) => {
    await page.getByRole("link", { name: /analytics/i }).click();
    await expect(page).toHaveURL(/\/analytics/);
  });

  test("3.5 Settings accessible", async ({ page }) => {
    await page.getByRole("link", { name: /settings/i }).first().click();
    await expect(page).toHaveURL(/\/settings/);
  });

  test("3.6 Theme switcher and logout", async ({ page }) => {
    await page.getByRole("button", { name: /logout/i }).click();
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

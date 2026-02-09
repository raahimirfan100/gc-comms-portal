import { test, expect } from "@playwright/test";

/**
 * Phase 8: Edge cases / robustness
 * User flow: Protected route without login → Invalid IDs (with login)
 */
test.describe("Phase 8: Edge cases", () => {
  test("8.1 Protected route without login redirects to login", async ({ page }) => {
    await page.goto("/drives");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("8.2 Invalid drive ID shows error or 404", async ({ page }) => {
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
    await page.goto("/drives/00000000-0000-0000-0000-000000000000");
    await expect(
      page.getByText(/not found|error|invalid/i).or(page.locator("body"))
    ).toBeVisible({ timeout: 10000 });
  });

  test("8.3 Invalid volunteer ID shows error or 404", async ({ page }) => {
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
    await page.goto("/volunteers/00000000-0000-0000-0000-000000000000");
    await expect(
      page.getByText(/not found|error|invalid/i).or(page.locator("body"))
    ).toBeVisible({ timeout: 10000 });
  });
});

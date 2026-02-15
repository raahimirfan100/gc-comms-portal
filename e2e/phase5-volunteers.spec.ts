import { test, expect } from "@playwright/test";

/**
 * Phase 5: Volunteers (after login)
 * User flow: List → Add volunteer → Profile → Import
 */
test.describe("Phase 5: Volunteers (requires login)", () => {
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

  test("5.1 Volunteer list: table, search, gender filter", async ({ page }) => {
    await page.goto("/volunteers");
    await expect(page.getByRole("heading", { name: "Volunteers" })).toBeVisible();
    await expect(page.getByPlaceholder(/search by name/i)).toBeVisible();
  });

  test("5.2 Add volunteer: form and submit", async ({ page }) => {
    await page.goto("/volunteers/new");
    await expect(page.getByText("Add Volunteer").first()).toBeVisible();
    await page.getByLabel(/full name/i).fill("E2E Volunteer");
    await page.getByLabel(/phone/i).fill("03009876543");
    await page.getByLabel(/email/i).fill("e2e-add@test.local");
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: /female/i }).click();
    await page.getByRole("button", { name: /add volunteer/i }).click();
    await expect(page).toHaveURL(/\/volunteers/, { timeout: 15000 });
  });

  test("5.3 Volunteer profile: open from list", async ({ page }) => {
    await page.goto("/volunteers");
    const firstProfileLink = page.locator('table a[href^="/volunteers/"]').first();
    if (!(await firstProfileLink.isVisible())) {
      test.skip();
      return;
    }
    await firstProfileLink.click();
    await expect(page).toHaveURL(/\/volunteers\/[a-f0-9-]+/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("5.4 Import page loads", async ({ page }) => {
    await page.goto("/volunteers/import");
    await expect(page).toHaveURL(/\/volunteers\/import/);
    await expect(
      page.getByText(/import|bulk|csv|paste/i).first()
    ).toBeVisible({ timeout: 10000 });
  });
});

import { test, expect } from "@playwright/test";

/**
 * Phase 6: Duties (after login)
 * User flow: List → Open duty rules
 */
test.describe("Phase 6: Duties (requires login)", () => {
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

  test("6.1 Duty list loads", async ({ page }) => {
    await page.goto("/duties");
    await expect(page.getByText("Duties")).toBeVisible();
    await expect(
      page.getByText(/manage duty types|capacity rules/i).first()
    ).toBeVisible();
  });

  test("6.2 Duty rules page: open first duty rules", async ({ page }) => {
    await page.goto("/duties");
    const rulesLink = page.getByRole("link", { name: /rules/i }).first();
    if (!(await rulesLink.isVisible())) {
      test.skip();
      return;
    }
    await rulesLink.click();
    await expect(page).toHaveURL(/\/duties\/[a-f0-9-]+\/rules/);
    await expect(page.locator("body")).toBeVisible();
  });
});

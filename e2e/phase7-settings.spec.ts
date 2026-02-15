import { test, expect } from "@playwright/test";

/**
 * Phase 7: Settings (after login)
 * User flow: General → Assignment → Calling → Reminders → WhatsApp → Sheets → Alerts
 */
test.describe("Phase 7: Settings (requires login)", () => {
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

  test("7.1 General: seasons", async ({ page }) => {
    await page.goto("/settings/general");
    await expect(page).toHaveURL(/\/settings\/general/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("7.2 Assignment", async ({ page }) => {
    await page.goto("/settings/assignment");
    await expect(page).toHaveURL(/\/settings\/assignment/);
  });

  test("7.3 Calling", async ({ page }) => {
    await page.goto("/settings/calling");
    await expect(page).toHaveURL(/\/settings\/calling/);
  });

  test("7.4 Reminders", async ({ page }) => {
    await page.goto("/settings/reminders");
    await expect(page).toHaveURL(/\/settings\/reminders/);
  });

  test("7.5 WhatsApp", async ({ page }) => {
    await page.goto("/settings/whatsapp");
    await expect(page).toHaveURL(/\/settings\/whatsapp/);
  });

  test("7.6 Sheets", async ({ page }) => {
    await page.goto("/settings/sheets");
    await expect(page).toHaveURL(/\/settings\/sheets/);
  });

  test("7.7 Alerts", async ({ page }) => {
    await page.goto("/settings/alerts");
    await expect(page).toHaveURL(/\/settings\/alerts/);
  });
});

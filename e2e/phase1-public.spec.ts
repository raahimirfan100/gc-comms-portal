import { test, expect } from "@playwright/test";

test.describe("Phase 1: Public pages", () => {
  test("1.1 Landing page redirects to /drives", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/(drives|auth\/login)/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("1.2 Volunteer registration page has form fields", async ({ page }) => {
    await page.goto("/join");
    await expect(page.getByText("Grand Citizens")).toBeVisible();
    await expect(page.getByLabel(/full name/i)).toBeVisible();
    await expect(page.getByLabel(/phone/i)).toBeVisible();
    await expect(page.getByLabel(/email/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /sign up as volunteer/i })).toBeVisible();
  });

  test("1.3 Volunteer registration submit when drives exist", async ({ page }) => {
    await page.goto("/join");
    const noDrives = await page.getByText("No upcoming drives available").isVisible();
    if (noDrives) {
      test.skip();
      return;
    }
    await page.getByLabel(/full name/i).fill("E2E Test Volunteer");
    await page.getByLabel(/email/i).first().fill("e2e-vol@test.local");
    await page.getByLabel(/phone number/i).fill("03001234567");
    await page.getByRole("combobox", { name: /gender/i }).click();
    await page.getByRole("option", { name: /^male$/i }).click();
    await page.locator("label").filter({ has: page.getByRole("checkbox") }).first().click();
    await page.getByLabel(/I agree to volunteer/i).check();
    await page.getByRole("button", { name: /sign up as volunteer/i }).click();
    await expect(page.getByText(/JazakAllah Khair|registered|confirmation/i)).toBeVisible({ timeout: 15000 });
  });
});

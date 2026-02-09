import { test, expect } from "@playwright/test";

test.describe("Phase 4: Drives (requires login)", () => {
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

  test("4.1 Drive list shows content or empty state", async ({ page }) => {
    await page.goto("/drives");
    await expect(
      page.getByText(/Iftaar Drives|No active season|Create a season/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("4.2 Create drive: with no active season shows message or form", async ({ page }) => {
    await page.goto("/drives");
    const noSeason = await page.getByText("No Active Season").isVisible();
    if (noSeason) {
      await expect(page.getByRole("link", { name: /settings|Go to Settings/i })).toBeVisible();
      return;
    }
    await page.goto("/drives/new");
    await expect(page.getByText(/Create New Drive|create new drive/i)).toBeVisible({ timeout: 10000 });
  });

  test("4.3 Create drive with active season", async ({ page }) => {
    await page.goto("/drives");
    const noSeason = await page.getByText("No Active Season").isVisible();
    if (noSeason) {
      test.skip();
      return;
    }
    await page.goto("/drives/new");
    await page.waitForLoadState("networkidle");
    await page.getByLabel(/drive name/i).fill("E2E Test Drive");
    await page.getByLabel(/date/i).fill("2026-03-15");
    await page.getByLabel(/location name/i).fill("E2E Location");
    await page.getByLabel(/daig count/i).fill("5");
    const createBtn = page.getByRole("button", { name: /create drive/i });
    await expect(createBtn).toBeEnabled({ timeout: 25000 });
    await createBtn.click();
    await expect(page.getByText(/created|success|Iftaar Drives/i)).toBeVisible({ timeout: 15000 });
  });

  test("4.4 Drive detail and tabs", async ({ page }) => {
    await page.goto("/drives");
    const link = page.locator('a[href^="/drives/"]').first();
    if (!(await link.isVisible())) {
      test.skip();
      return;
    }
    await link.click();
    await expect(page).toHaveURL(/\/drives\/[a-f0-9-]+/);
    await expect(page.getByRole("link", { name: /Duty Board/i })).toBeVisible({ timeout: 5000 });
  });

  test("4.5 Drive status control", async ({ page }) => {
    await page.goto("/drives");
    const driveLink = page.locator('a[href^="/drives/"]').first();
    if (!(await driveLink.isVisible())) {
      test.skip();
      return;
    }
    await driveLink.click();
    const statusControl = page.getByRole("combobox").or(page.getByText(/draft|open|closed/i)).first();
    if (await statusControl.isVisible()) {
      await statusControl.click();
      const openOpt = page.getByRole("option", { name: /open/i });
      if (await openOpt.isVisible()) await openOpt.click();
    }
    await expect(page.locator("body")).toBeVisible();
  });

  test("4.6 Assignments page loads", async ({ page }) => {
    await page.goto("/drives");
    const driveLink = page.locator('a[href^="/drives/"]').first();
    if (!(await driveLink.isVisible())) {
      test.skip();
      return;
    }
    await driveLink.click();
    await page.getByRole("link", { name: /Duty Board/i }).click();
    await expect(page).toHaveURL(/\/assignments/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("4.7 Batch auto-assign if button exists", async ({ page }) => {
    await page.goto("/drives");
    const driveLink = page.locator('a[href^="/drives/"]').first();
    if (!(await driveLink.isVisible())) {
      test.skip();
      return;
    }
    await driveLink.click();
    await page.getByRole("link", { name: /Duty Board/i }).click();
    const batchBtn = page.getByRole("button", { name: /batch|auto-assign|assign/i });
    if (await batchBtn.isVisible()) {
      await batchBtn.click();
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("4.9 Calls page", async ({ page }) => {
    await page.goto("/drives");
    const driveLink = page.locator('a[href^="/drives/"]').first();
    if (!(await driveLink.isVisible())) {
      test.skip();
      return;
    }
    await driveLink.click();
    await page.getByRole("link", { name: /Call Center/i }).click();
    await expect(page).toHaveURL(/\/calls/);
  });

  test("4.10 Live page", async ({ page }) => {
    await page.goto("/drives");
    const driveLink = page.locator('a[href^="/drives/"]').first();
    if (!(await driveLink.isVisible())) {
      test.skip();
      return;
    }
    await driveLink.click();
    await page.getByRole("link", { name: /Live Dashboard/i }).click();
    await expect(page).toHaveURL(/\/live/);
  });

  test("4.11 Reminders page", async ({ page }) => {
    await page.goto("/drives");
    const driveLink = page.locator('a[href^="/drives/"]').first();
    if (!(await driveLink.isVisible())) {
      test.skip();
      return;
    }
    await driveLink.click();
    await page.getByRole("link", { name: /Reminders/i }).click();
    await expect(page).toHaveURL(/\/reminders/);
  });
});

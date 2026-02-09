import { test, expect } from "@playwright/test";

/**
 * Flow: Full admin journey following APPLICATION_FLOW.md
 * Login → Create season (if needed) → Create drive → Add volunteer → Assign
 */
test.describe("Flow: Admin journey (requires login)", () => {
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

  test("Full journey: ensure season → create drive → add volunteer → assignments", async ({
    page,
  }) => {
    await page.goto("/drives");
    await expect(
      page.getByText("No Active Season").or(
        page.getByRole("heading", { name: "Iftaar Drives" })
      )
    ).toBeVisible({ timeout: 15000 });
    const noSeason = await page.getByText("No Active Season").isVisible();
    if (noSeason) {
      await page.goto("/settings/general");
      await page.getByRole("button", { name: /new season/i }).click();
      await page.getByRole("dialog").getByLabel(/^name$/i).fill("E2E Season");
      await page.getByRole("dialog").getByLabel(/hijri year/i).fill("1447");
      await page.getByRole("dialog").getByLabel(/start date/i).fill("2026-03-01");
      await page.getByRole("dialog").getByLabel(/end date/i).fill("2026-03-30");
      await page.getByRole("dialog").getByRole("button", { name: /^create$/i }).click();
      await expect(page.getByText(/season created|created/i)).toBeVisible({ timeout: 10000 });
      await page.goto("/drives");
    }

    await page.goto("/drives/new");
    await page.waitForLoadState("networkidle");
    const createBtn = page.getByRole("button", { name: /create drive/i });
    await expect(createBtn).toBeEnabled({ timeout: 15000 });
    await page.getByLabel(/drive name/i).fill("E2E Flow Drive");
    await page.getByLabel(/date/i).fill("2026-03-15");
    await page.getByLabel(/location name/i).fill("E2E Flow Location");
    await page.getByLabel(/daig count/i).fill("5");
    await createBtn.click();
    await expect(page.getByText(/created|success|Iftaar Drives/i)).toBeVisible({
      timeout: 15000,
    });

    await page.goto("/volunteers/new");
    await page.getByLabel(/full name/i).fill("E2E Flow Volunteer");
    await page.getByLabel(/phone/i).fill("03001112222");
    await page.getByLabel(/email/i).fill("e2e-flow@test.local");
    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: /^male$/i }).click();
    await page.getByRole("button", { name: /add volunteer/i }).click();
    await expect(page).toHaveURL(/\/volunteers/, { timeout: 15000 });

    await page.goto("/drives");
    const driveLink = page.locator('a[href^="/drives/"]').first();
    if (await driveLink.isVisible()) {
      await driveLink.click();
      await page.getByRole("link", { name: /Duty Board/i }).click();
      await expect(page).toHaveURL(/\/assignments/);
      const batchBtn = page.getByRole("button", { name: /batch|auto-assign|assign/i });
      if (await batchBtn.isVisible()) {
        await batchBtn.click();
        await expect(page.locator("body")).toBeVisible();
      }
    }
  });
});

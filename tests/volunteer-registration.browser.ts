import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { join } from "path";

/**
 * Browser-based tests for volunteer registration using Playwriter CLI
 * 
 * Prerequisites:
 * 1. Install Playwriter: npm i -g playwriter
 * 2. Install Chrome extension and activate it on localhost:3000
 * 3. Run: npm run dev (Next.js dev server)
 * 4. Run integration script first: npx tsx tests/auto-assign.integration.ts
 */

let SESSION_ID = "1"; // Will be set by ensureSession
const BASE_URL = "http://localhost:3000";

function playwriter(command: string): string {
  try {
    return execSync(`playwriter -s ${SESSION_ID} -e ${JSON.stringify(command)}`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch (error: any) {
    console.error(`Playwriter command failed: ${command}`);
    console.error(error.message);
    throw error;
  }
}

async function ensureSession() {
  try {
    // Try to create the session, or use existing session 1
    const result = execSync(`playwriter session new`, { 
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    // Extract session ID from output (e.g., "Session 1 created")
    const match = result.match(/Session (\d+) created/);
    if (match) {
      return match[1];
    }
    return "1"; // Default to session 1
  } catch (error: any) {
    // If session creation fails, try to use session 1
    console.log("Using default session 1");
    return "1";
  }
}

async function waitFor(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface TestResult {
  scenario: string;
  passed: boolean;
  steps: Array<{ action: string; result: string; error?: string }>;
  finalAssignmentText?: string;
}

async function scenarioA_ReturningMaleWithWaitlist(): Promise<TestResult> {
  console.log("\n=== Scenario A: Returning Male + Waitlist Drive ===");
  const steps: Array<{ action: string; result: string; error?: string }> = [];

  try {
    // Navigate to registration page
    steps.push({ action: "Navigate to /volunteer/register", result: "Loading..." });
    playwriter(`await page.goto('${BASE_URL}/volunteer/register')`);
    await waitFor(2000);
    steps[steps.length - 1].result = "Page loaded";

    // Fill phone number (Step 1)
    steps.push({ action: "Enter phone: 03001111111", result: "Filling..." });
    playwriter(`await page.locator('input[name="phone"]').fill('03001111111')`);
    await waitFor(500);
    steps[steps.length - 1].result = "Phone entered";

    // Click Continue button
    steps.push({ action: "Click Continue", result: "Clicking..." });
    playwriter(`await page.locator('button:has-text("Continue")').click()`);
    await waitFor(2000);
    steps[steps.length - 1].result = "Navigated to Step 2";

    // Verify prefill
    steps.push({ action: "Verify name prefill", result: "Checking..." });
    const nameValue = playwriter(`await page.locator('input[id="name"]').inputValue()`);
    steps[steps.length - 1].result = `Name value: ${nameValue}`;
    if (!nameValue.includes("Test Male FirstTimer")) {
      throw new Error(`Expected name prefilled, got: ${nameValue}`);
    }

    // Click Next
    steps.push({ action: "Click Next", result: "Clicking..." });
    playwriter(`await page.locator('button:has-text("Next")').click()`);
    await waitFor(2000);
    steps[steps.length - 1].result = "Navigated to Step 3";

    // Check waitlist drive
    steps.push({ action: "Check 'AutoAssign Test – Waitlist' drive", result: "Checking..." });
    const waitlistDriveCard = playwriter(`
      const cards = await page.locator('[class*="Card"]').all();
      for (const card of cards) {
        const text = await card.textContent();
        if (text && text.includes('AutoAssign Test – Waitlist')) {
          await card.click();
          break;
        }
      }
    `);
    await waitFor(500);
    steps[steps.length - 1].result = "Waitlist drive checked";

    // Check agreement checkbox
    steps.push({ action: "Check agreement checkbox", result: "Checking..." });
    playwriter(`await page.locator('input[id="agreement"]').check()`);
    await waitFor(500);
    steps[steps.length - 1].result = "Agreement checked";

    // Submit form
    steps.push({ action: "Click 'Sign Up as Volunteer'", result: "Submitting..." });
    playwriter(`await page.locator('button:has-text("Sign Up as Volunteer")').click()`);
    await waitFor(3000);
    steps[steps.length - 1].result = "Form submitted";

    // Extract assignment text
    steps.push({ action: "Extract assignment summary", result: "Reading..." });
    const assignmentText = playwriter(`
      const pre = await page.locator('pre').textContent();
      pre || '';
    `);
    steps[steps.length - 1].result = `Assignment text: ${assignmentText.substring(0, 100)}...`;

    const hasWaitlisted = assignmentText.includes("Waitlisted");
    if (!hasWaitlisted) {
      throw new Error(`Expected waitlisted assignment, got: ${assignmentText}`);
    }

    return {
      scenario: "Scenario A: Returning Male + Waitlist",
      passed: true,
      steps,
      finalAssignmentText: assignmentText,
    };
  } catch (error: any) {
    return {
      scenario: "Scenario A: Returning Male + Waitlist",
      passed: false,
      steps,
      finalAssignmentText: undefined,
    };
  }
}

async function scenarioB_NewFemaleFirstTimer(): Promise<TestResult> {
  console.log("\n=== Scenario B: New Female First-Timer ===");
  const steps: Array<{ action: string; result: string; error?: string }> = [];

  try {
    // Navigate to registration page
    steps.push({ action: "Navigate to /volunteer/register", result: "Loading..." });
    playwriter(`await page.goto('${BASE_URL}/volunteer/register')`);
    await waitFor(2000);
    steps[steps.length - 1].result = "Page loaded";

    // Enter new phone number
    steps.push({ action: "Enter phone: 03001111116", result: "Filling..." });
    playwriter(`await page.locator('input[name="phone"]').fill('03001111116')`);
    await waitFor(500);
    steps[steps.length - 1].result = "Phone entered";

    // Click Continue
    steps.push({ action: "Click Continue", result: "Clicking..." });
    playwriter(`await page.locator('button:has-text("Continue")').click()`);
    await waitFor(2000);
    steps[steps.length - 1].result = "Navigated to Step 2 (no prefill expected)";

    // Fill name
    steps.push({ action: "Fill name: Manual Female FirstTimer", result: "Filling..." });
    playwriter(`await page.locator('input[id="name"]').fill('Manual Female FirstTimer')`);
    await waitFor(500);
    steps[steps.length - 1].result = "Name filled";

    // Select gender
    steps.push({ action: "Select gender: Female", result: "Selecting..." });
    playwriter(`await page.locator('button[role="combobox"]').click()`);
    await waitFor(500);
    playwriter(`await page.locator('text=Female').click()`);
    await waitFor(500);
    steps[steps.length - 1].result = "Gender selected";

    // Click Next
    steps.push({ action: "Click Next", result: "Clicking..." });
    playwriter(`await page.locator('button:has-text("Next")').click()`);
    await waitFor(2000);
    steps[steps.length - 1].result = "Navigated to Step 3";

    // Check First Timers drive
    steps.push({ action: "Check 'AutoAssign Test – First Timers' drive", result: "Checking..." });
    playwriter(`
      const cards = await page.locator('[class*="Card"]').all();
      for (const card of cards) {
        const text = await card.textContent();
        if (text && text.includes('AutoAssign Test – First Timers')) {
          await card.click();
          break;
        }
      }
    `);
    await waitFor(500);
    steps[steps.length - 1].result = "First Timers drive checked";

    // Check agreement and submit
    steps.push({ action: "Check agreement and submit", result: "Submitting..." });
    playwriter(`await page.locator('input[id="agreement"]').check()`);
    await waitFor(500);
    playwriter(`await page.locator('button:has-text("Sign Up as Volunteer")').click()`);
    await waitFor(3000);
    steps[steps.length - 1].result = "Form submitted";

    // Extract assignment
    const assignmentText = playwriter(`await page.locator('pre').textContent() || ''`);
    steps.push({ action: "Extract assignment summary", result: `Assignment: ${assignmentText.substring(0, 100)}...` });

    const hasThaal = assignmentText.includes("Thaal");
    if (!hasThaal) {
      throw new Error(`Expected Thaal assignment, got: ${assignmentText}`);
    }

    return {
      scenario: "Scenario B: New Female First-Timer",
      passed: true,
      steps,
      finalAssignmentText: assignmentText,
    };
  } catch (error: any) {
    return {
      scenario: "Scenario B: New Female First-Timer",
      passed: false,
      steps,
      finalAssignmentText: undefined,
    };
  }
}

async function scenarioC_ReturningMaleDutyFull(): Promise<TestResult> {
  console.log("\n=== Scenario C: Returning Male, Preferred Duty Full ===");
  const steps: Array<{ action: string; result: string; error?: string }> = [];

  try {
    // Navigate
    steps.push({ action: "Navigate to /volunteer/register", result: "Loading..." });
    playwriter(`await page.goto('${BASE_URL}/volunteer/register')`);
    await waitFor(2000);
    steps[steps.length - 1].result = "Page loaded";

    // Enter returning phone
    steps.push({ action: "Enter phone: 03001111113", result: "Filling..." });
    playwriter(`await page.locator('input[name="phone"]').fill('03001111113')`);
    await waitFor(500);
    steps[steps.length - 1].result = "Phone entered";

    // Continue
    steps.push({ action: "Click Continue", result: "Clicking..." });
    playwriter(`await page.locator('button:has-text("Continue")').click()`);
    await waitFor(2000);
    steps[steps.length - 1].result = "Navigated to Step 2";

    // Verify prefill
    const nameValue = playwriter(`await page.locator('input[id="name"]').inputValue()`);
    steps.push({ action: "Verify name prefill", result: `Name: ${nameValue}` });
    if (!nameValue.includes("Test Male Returning")) {
      throw new Error(`Expected returning volunteer name, got: ${nameValue}`);
    }

    // Next
    steps.push({ action: "Click Next", result: "Clicking..." });
    playwriter(`await page.locator('button:has-text("Next")').click()`);
    await waitFor(2000);
    steps[steps.length - 1].result = "Navigated to Step 3";

    // Check Returning Duty Full drive
    steps.push({ action: "Check 'AutoAssign Test – Returning Duty Full' drive", result: "Checking..." });
    playwriter(`
      const cards = await page.locator('[class*="Card"]').all();
      for (const card of cards) {
        const text = await card.textContent();
        if (text && text.includes('AutoAssign Test – Returning Duty Full')) {
          await card.click();
          break;
        }
      }
    `);
    await waitFor(500);
    steps[steps.length - 1].result = "Returning Duty Full drive checked";

    // Submit
    steps.push({ action: "Check agreement and submit", result: "Submitting..." });
    playwriter(`await page.locator('input[id="agreement"]').check()`);
    await waitFor(500);
    playwriter(`await page.locator('button:has-text("Sign Up as Volunteer")').click()`);
    await waitFor(3000);
    steps[steps.length - 1].result = "Form submitted";

    // Extract assignment
    const assignmentText = playwriter(`await page.locator('pre').textContent() || ''`);
    steps.push({ action: "Extract assignment summary", result: `Assignment: ${assignmentText.substring(0, 100)}...` });

    const hasDari = assignmentText.includes("Dari");
    if (!hasDari) {
      throw new Error(`Expected Dari assignment (fallback from Provider), got: ${assignmentText}`);
    }

    return {
      scenario: "Scenario C: Returning Male, Preferred Duty Full",
      passed: true,
      steps,
      finalAssignmentText: assignmentText,
    };
  } catch (error: any) {
    return {
      scenario: "Scenario C: Returning Male, Preferred Duty Full",
      passed: false,
      steps,
      finalAssignmentText: undefined,
    };
  }
}

async function main() {
  console.log("Starting Playwriter browser tests for volunteer registration...");
  console.log("Make sure:");
  console.log("1. Playwriter extension is installed and activated (green icon)");
  console.log("2. Chrome is open with localhost:3000 tab");
  console.log("3. Next.js dev server is running");
  console.log("4. Integration test data exists (run: npx tsx tests/auto-assign.integration.ts)\n");

  SESSION_ID = await ensureSession();
  console.log(`Using session: ${SESSION_ID}\n`);

  const results: TestResult[] = [];

  results.push(await scenarioA_ReturningMaleWithWaitlist());
  await waitFor(2000);

  results.push(await scenarioB_NewFemaleFirstTimer());
  await waitFor(2000);

  results.push(await scenarioC_ReturningMaleDutyFull());

  // Generate report
  console.log("\n=== Test Results Summary ===");
  const reportPath = join(process.cwd(), "docs", "testing", "BROWSER_TEST_REPORT.md");
  let report = "# Browser Test Report - Volunteer Registration\n\n";
  report += `Generated: ${new Date().toISOString()}\n\n`;

  for (const result of results) {
    const status = result.passed ? "✅ PASSED" : "❌ FAILED";
    report += `## ${result.scenario}\n\n`;
    report += `**Status:** ${status}\n\n`;
    report += "### Steps:\n\n";
    for (const step of result.steps) {
      report += `1. **${step.action}**\n   - Result: ${step.result}\n`;
      if (step.error) {
        report += `   - Error: ${step.error}\n`;
      }
    }
    if (result.finalAssignmentText) {
      report += `\n### Final Assignment Text:\n\`\`\`\n${result.finalAssignmentText}\n\`\`\`\n\n`;
    }
    report += "---\n\n";
  }

  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  report += `## Summary\n\n`;
  report += `**Passed:** ${passedCount}/${totalCount}\n\n`;

  writeFileSync(reportPath, report);
  console.log(`\nFull report saved to: ${reportPath}`);

  process.exit(passedCount === totalCount ? 0 : 1);
}

main().catch((error) => {
  console.error("Browser tests failed:", error);
  process.exit(1);
});

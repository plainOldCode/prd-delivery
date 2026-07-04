// e2e/bench.spec.ts — Benchmark Flow: Model Selection -> Run -> Progress -> Result -> Report
import { test, expect } from '@playwright/test';

test.describe('LLM Benchmark E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Ensure user is logged in before each bench test
    await page.goto('/auth');

    // 1. Force switch to Sign Up mode if we are in Sign In mode
    const signUpToggle = page.getByRole('button', { name: 'Sign Up' }).filter({ hasText: 'Sign Up' });
    // Since the submit button also says "Sign Up", we need to be careful. 
    // The toggle is usually a small link at the bottom.
    // A better way in Playwright for this specific UI:
    const toggle = page.locator('p').filter({ hasText: 'Don\'t have an account?' }).getByRole('button', { name: 'Sign Up' });
    if (await toggle.isVisible()) {
      await toggle.click();
    }

    // 2. Fill the form
    await page.getByLabel('Username').fill('bench-tester');
    await page.getByLabel('Password', { exact: true }).fill('strongPass123!');
    
    // Only fill confirm password if we are actually in signup mode (which we should be now)
    const confirmPass = page.getByLabel('Confirm Password');
    if (await confirmPass.isVisible()) {
      await confirmPass.fill('strongPass123!');
    }

    // 3. Submit the form (The submit button text depends on mode, but it's the only submit button)
    await page.getByRole('button', { name: /Sign Up|Sign In/ }).first().click();

    // 4. Verify login success by checking the profile username
    await expect(page.locator('[data-testid="profile-username"]')).toBeVisible({ timeout: 15_000 });
  });

  test('Benchmark full cycle: Run to detailed report', async ({ page }) => {
    // 1. Navigate to Benchmark Page
    await page.goto('/bench');
    await expect(page.getByRole('heading', { name: 'Benchmark', exact: true })).toBeVisible();

    // 2. Select a model (find any available model badge)
    await expect(page.locator('text=Loading models…')).toBeHidden({ timeout: 15_000 });
    const modelBadge = page.locator('button').filter({ hasText: /llama|qwen/i }).first();
    await expect(modelBadge).toBeVisible({ timeout: 10_000 });
    const modelName = await modelBadge.innerText();
    await modelBadge.click();

    // 3. Start Benchmark
    const startBtn = page.getByRole('button', { name: 'Start Benchmark' });
    await expect(startBtn).toBeEnabled();
    await startBtn.click();

    // 4. Verify Progress (SSE check)
    // We wait for the progress bar's message to change from "준비 중" to something else
    await expect(page.locator('.text-sm.font-mono').first()).not.toContainText('Benchmark 준비 중...', { timeout: 30_000 });
    
    // Wait until benchmark is completed (Running state disappears or Result panel appears)
    const resultPanel = page.locator('h3').filter({ hasText: modelName });
    await expect(resultPanel).toBeVisible({ timeout: 60_000 });

    // 5. Verify Summary Results are present
    await expect(page.getByText(/Prompt TPS/)).toBeVisible();
    await expect(page.getByText(/Gen TPS/)).toBeVisible();

    // 6. Navigate to Detailed Report (if a link provided) or verify result click if implemented
    // In current implementation, we just show the summary on the same page.
    // The PRD mentioned /results/:id. Let's check if there's a transition.
    // Since it is not explicitly linked in the current BenchPage UI (only ResultsPanel), 
    // we should probably add a "View Full Report" button to the ResultsPanel first.
  });
});
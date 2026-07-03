// e2e/auth.spec.ts — Sign Up → Sign In → Dashboard → Sign Out
import { test, expect } from '@playwright/test';

test('Auth flow: Sign Up -> Sign In -> Dashboard -> Sign Out', async ({ page }) => {
  // Navigate to auth page directly
  await page.goto('/auth');

  // Wait for the page to fully render — check either heading or any input
  await expect(page.locator('#username')).toBeVisible({ timeout: 10_000 });

  // ===== Sign Up =====
  const usernameInput = page.getByLabel('Username');
  const passwordInput = page.getByLabel('Password', { exact: true });
  const confirmInput  = page.getByLabel('Confirm Password');
  const submitBtn     = page.getByRole('button', { name: 'Sign In' });

  // Switch to Sign Up mode
  await page.getByRole('button', { name: 'Sign Up' }).click();
  await expect(page.locator('[data-testid="auth-heading"]')).toContainText('Sign Up');

  await usernameInput.fill('playwright-test');
  await passwordInput.fill('strongPass123!');
  await confirmInput.fill('strongPass123!');
  await page.getByRole('button', { name: 'Sign Up' }).click();

  // Should be redirected to Home with user logged in
  await expect(page.locator('[data-testid="profile-username"]')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('[data-testid="profile-username"]')).toContainText('playwright-test');

  // ===== Sign Out =====
  await page.locator('[data-testid="profile-menu"]').first().click();
  await page.getByRole('button', { name: 'Sign Out' }).click();

  // Should be back on homepage — redirected to /auth
  await expect(page).toHaveURL(/\/auth/, { timeout: 10_000 });

  // ===== Sign In =====
  await usernameInput.fill('playwright-test');
  await passwordInput.fill('strongPass123!');
  await submitBtn.click();

  // Back on Home with user logged in again
  await expect(page.locator('[data-testid="profile-username"]')).toBeVisible({ timeout: 10_000 });
});
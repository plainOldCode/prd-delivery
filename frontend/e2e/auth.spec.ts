// e2e/auth.spec.ts — Sign Up → Sign In → Dashboard → Sign Out
import { test, expect } from '@playwright/test';

test('Auth flow: Sign Up -> Sign In -> Dashboard -> Sign Out', async ({ page }) => {
   // Navigate directly to /auth — bypass any redirect race in App router
  await page.goto('/auth');

   // Wait for the auth form to render — #username is always present even before
   // AuthContext finishes loading, so this is more reliable than auth-heading.
   await expect(page.locator('#username')).toBeVisible({ timeout: 15_000 });

   const usernameInput = page.getByLabel('Username');
  const passwordInput = page.getByLabel('Password', { exact: true });
  const confirmInput  = page.getByLabel('Confirm Password');
  const submitBtn     = page.getByRole('button', { name: 'Sign In' });

   // ===== Sign Up =====
   // Toggle to Sign Up mode
  await page.getByRole('button', { name: 'Sign Up' }).click();
  await expect(page.locator('[data-testid="auth-heading"]')).toContainText('Sign Up');

   await usernameInput.fill('playwright-test');
  await passwordInput.fill('strongPass123!');
  await confirmInput.fill('strongPass123!');
  await page.getByRole('button', { name: 'Sign Up' }).click();

   // Should be redirected to Home after signup — check profile username
  await expect(page.locator('[data-testid="profile-username"]')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('[data-testid="profile-username"]')).toContainText('playwright-test');

   // ===== Sign Out =====
  await page.locator('[data-testid="profile-menu"]').first().click();
  await page.getByRole('button', { name: 'Sign Out' }).click();

   // After sign out, the app should redirect to /auth
   // Instead of checking URL (SPA routing inconsistency), wait for auth page to appear
  await expect(page.locator('#username')).toBeVisible({ timeout: 15_000 });

   // ===== Sign In =====
  await usernameInput.fill('playwright-test');
  await passwordInput.fill('strongPass123!');
  await submitBtn.click();

   // Back on Home with user logged in again
  await expect(page.locator('[data-testid="profile-username"]')).toBeVisible({ timeout: 15_000 });
});

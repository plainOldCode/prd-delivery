// e2e/auth.spec.ts — Sign Up → Sign In → Dashboard → Sign Out
import { test, expect } from '@playwright/test';
import { ensureLoggedIn, TEST_USER } from './helpers/auth-helpers';

test('Auth flow: Sign Up -> Sign In -> Dashboard -> Sign Out', async ({ page }) => {
  await page.goto('/auth');

   // Wait for the auth form to render — #username is always present even before
  // AuthContext finishes loading, so this is more reliable than auth-heading.
  await expect(page.locator('#username')).toBeVisible({ timeout: 15_000 });

   // ===== Sign Up (via ensureLoggedIn helper) =====
  await ensureLoggedIn(page);

   // Should be on Home with user logged in after signup — check profile username
  await expect(page.locator('[data-testid="profile-username"]')).toBeVisible();
  await expect(page.locator('[data-testid="profile-username"]')).toContainText(TEST_USER.username);

   // ===== Sign Out =====
  await page.locator('[data-testid="profile-menu"]').first().click();
  await page.getByRole('button', { name: 'Sign Out' }).click();

   // After sign out, the app should redirect to /auth
   // Instead of checking URL (SPA routing inconsistency), wait for auth page to appear
  await expect(page.locator('#username')).toBeVisible({ timeout: 15_000 });

   // ===== Sign In =====
  const usernameInput = page.getByLabel('Username');
  const passwordInput = page.getByLabel('Password', { exact: true });
  const submitBtn = page.getByRole('button', { name: 'Sign In' });

  await usernameInput.fill(TEST_USER.username);
  await passwordInput.fill(TEST_USER.password);
  await submitBtn.click();

   // Back on Home with user logged in again
  await expect(page.locator('[data-testid="profile-username"]')).toBeVisible({ timeout: 15_000 });
});

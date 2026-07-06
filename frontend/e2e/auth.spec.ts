// e2e/auth.spec.ts — Sign Up → Sign In → Dashboard → Sign Out
import { test, expect } from '@playwright/test';
import { ensureLoggedIn } from './helpers/auth-helpers';
import { TEST_USER } from './helpers/auth-helpers.constants';

test('Auth flow: Sign Up -> Sign In -> Dashboard -> Sign Out', async ({ page }) => {
    // Go to auth page
  await page.goto('/auth');
  await expect(page.locator('#username')).toBeVisible({ timeout: 15_000 });

     // Step 1: Get logged in (signup if new, signin if already exists)
  await ensureLoggedIn(page);

     // Verify logged in state
  await expect(page.locator('[data-testid="profile-username"]')).toBeVisible();
  await expect(page.locator('[data-testid="profile-username"]')).toContainText(TEST_USER.username);

     // Step 2: Sign Out
  await page.locator('[data-testid="profile-menu"]').first().click();
  await page.getByRole('button', { name: 'Sign Out' }).click();

     // After sign out, the app should redirect to /auth — wait for auth form
  await expect(page.locator('#username')).toBeVisible({ timeout: 15_000 });

     // Step 3: Sign In again
  await page.locator('#username').fill(TEST_USER.username);
  await page.locator('#password').fill(TEST_USER.password);
  await page.getByRole('button', { name: 'Sign In' }).click();

     // Back on Home with user logged in again
  await expect(page.locator('[data-testid="profile-username"]')).toBeVisible({ timeout: 15_000 });
});

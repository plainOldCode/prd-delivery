import { test, expect } from '@playwright/test';

const USERNAME = `e2etest_${Date.now()}`;
const PASSWORD = 'testpwd123!';

test('Auth flow: Sign Up -> Sign In -> Dashboard -> Sign Out', async ({ page }) => {
  await page.goto('/');

   /* Redirect to /auth when not logged in */
  await expect(page).toHaveURL(/\/auth/, { timeout: 5000 });

  const usernameInput = page.getByLabel('Username');
  const passwordInput = page.getByLabel('Password', { exact: true });

   /* --- Step 1: Sign Up --- */
  if (!(await page.locator('[data-testid=auth-heading]').textContent())?.includes('Sign Up')) {
    await page.getByText(/^Sign Up$/).click();
   }
  await expect(usernameInput).toBeVisible();

  await usernameInput.fill(USERNAME);
  await passwordInput.fill(PASSWORD);
  await page.getByLabel('Confirm Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign Up' }).click();

   /* Verify redirected away from /auth */
  await expect(async () => {
    expect(page.url()).not.toMatch(/\/auth/);
  }).toPass({ timeout: 10000 });

   /* Profile menu visible with username */
  await page.locator('[data-testid=profile-menu]').waitFor({ timeout: 5000 });
  expect(await page.locator('[data-testid=profile-username]').textContent()).toContain(USERNAME);

   /* --- Step 2: Sign Out via profile dropdown --- */
  const profileContainer = page.locator('[data-testid=profile-menu]');
  await profileContainer.hover({ force: true });
  await page.getByRole('button', { name: 'Sign Out' }).click();

   /* Back on auth page, profile gone */
  await expect(page).toHaveURL(/\/auth/, { timeout: 5000 });
  await expect(profileContainer).toBeHidden({ timeout: 5000 });

   /* --- Step 3: Sign In with same credentials --- */
  if ((await page.locator('[data-testid=auth-heading]').textContent())?.includes('Sign Up')) {
    await page.getByText(/^Sign In$/).click();
   }

  await usernameInput.fill(USERNAME);
  await passwordInput.fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();

   /* Verify login success */
  await expect(async () => {
    expect(page.url()).not.toMatch(/\/auth/);
  }).toPass({ timeout: 10000 });

  await page.locator('[data-testid=profile-username]').waitFor({ timeout: 5000 });
  expect(await page.locator('[data-testid=profile-username]').textContent()).toContain(USERNAME);
});

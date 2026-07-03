# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Auth flow: Sign Up -> Sign In -> Dashboard -> Sign Out
- Location: e2e/auth.spec.ts:6:1

# Error details

```
TimeoutError: page.waitForSelector: Timeout 5000ms exceeded.
Call log:
  - waiting for locator('[data-testid="auth-heading"]') to be visible

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | const USERNAME = `e2etest_${Date.now()}`;
  4  | const PASSWORD = 'testpwd123!';
  5  | 
  6  | test('Auth flow: Sign Up -> Sign In -> Dashboard -> Sign Out', async ({ page }) => {
  7  |   await page.goto('/auth');
> 8  |   await page.waitForSelector('[data-testid="auth-heading"]', { timeout: 5000 });
     |              ^ TimeoutError: page.waitForSelector: Timeout 5000ms exceeded.
  9  | 
  10 |   const usernameInput = page.getByLabel('Username');
  11 |   const passwordInput = page.getByLabel('Password', { exact: true });
  12 | 
  13 |    /* --- Step 1: Sign Up --- */
  14 |   if (!(await page.locator('[data-testid=auth-heading]').textContent())?.includes('Sign Up')) {
  15 |     await page.getByText(/^Sign Up$/).click();
  16 |    }
  17 |   await expect(usernameInput).toBeVisible();
  18 | 
  19 |   await usernameInput.fill(USERNAME);
  20 |   await passwordInput.fill(PASSWORD);
  21 |   await page.getByLabel('Confirm Password').fill(PASSWORD);
  22 |   await page.getByRole('button', { name: 'Sign Up' }).click();
  23 | 
  24 |    /* Verify redirected away from /auth */
  25 |   await expect(async () => {
  26 |     expect(page.url()).not.toMatch(/\/auth/);
  27 |   }).toPass({ timeout: 10000 });
  28 | 
  29 |    /* Profile menu visible with username */
  30 |   await page.locator('[data-testid=profile-menu]').waitFor({ timeout: 5000 });
  31 |   expect(await page.locator('[data-testid=profile-username]').textContent()).toContain(USERNAME);
  32 | 
  33 |    /* --- Step 2: Sign Out via profile dropdown --- */
  34 |   const profileContainer = page.locator('[data-testid=profile-menu]');
  35 |   await profileContainer.hover({ force: true });
  36 |   await page.getByRole('button', { name: 'Sign Out' }).click();
  37 | 
  38 |    /* Back on auth page, profile gone */
  39 |   await expect(page).toHaveURL(/\/auth/, { timeout: 5000 });
  40 |   await expect(profileContainer).toBeHidden({ timeout: 5000 });
  41 | 
  42 |    /* --- Step 3: Sign In with same credentials --- */
  43 |   if ((await page.locator('[data-testid=auth-heading]').textContent())?.includes('Sign Up')) {
  44 |     await page.getByText(/^Sign In$/).click();
  45 |    }
  46 | 
  47 |   await usernameInput.fill(USERNAME);
  48 |   await passwordInput.fill(PASSWORD);
  49 |   await page.getByRole('button', { name: 'Sign In' }).click();
  50 | 
  51 |    /* Verify login success */
  52 |   await expect(async () => {
  53 |     expect(page.url()).not.toMatch(/\/auth/);
  54 |   }).toPass({ timeout: 10000 });
  55 | 
  56 |   await page.locator('[data-testid=profile-username]').waitFor({ timeout: 5000 });
  57 |   expect(await page.locator('[data-testid=profile-username]').textContent()).toContain(USERNAME);
  58 | });
  59 | 
```
// e2e/helpers/auth-helpers.ts — 인증 공통 헬퍼 (bench.spec.ts, auth.spec.ts에서 재사용)
import { Page } from '@playwright/test';
import { TEST_USER } from './auth-helpers.constants';

/**
 * 페이지를 로그인 상태로 만듭니다.
 * - 먼저 Sign In 시도 (auth.spec가 이미 user를 만들었을 수 있음)
 * - 실패하면 Sign Up → 자동 로그인됨
 * - Idempotent — 이미 로그인되어 있으면 패스
 */
export async function ensureLoggedIn(page: Page): Promise<void> {
     // If already logged in, skip
  await page.goto('/');
  if (await page.locator('[data-testid="profile-username"]').isVisible().catch(() => false)) {
    return;
    }

     // Try to sign in first (user might already exist from a previous test run)
  const signInSucceeded = await trySignIn(page);
  if (signInSucceeded) return;

     // Sign up, then auto-login happens after signup
  await doSignUp(page);
}

async function trySignIn(page: Page): Promise<boolean> {
  await page.goto('/auth');
  await page.locator('#username').waitFor({ state: 'visible', timeout: 10_000 });

     // Ensure we're on Sign In tab (check heading)
  const heading = page.locator('[data-testid="auth-heading"]');
  if ((await heading.textContent())?.trim() === 'Sign Up') {
       // We're in Sign Up mode, toggle to Sign In
    await page.getByText('Sign In').click();
     }

      // Fill and submit sign in form (using IDs)
  await page.locator('#username').fill(TEST_USER.username);
  await page.locator('#password').fill(TEST_USER.password);
  await page.getByRole('button', { name: 'Sign In' }).click();

      // Wait for login to succeed — either profile-username appears or error shows up
  try {
    await page.locator('[data-testid="profile-username"]').waitFor({ state: 'visible', timeout: 8_000 });
    return true;
     } catch {
     	// Sign in failed — user doesn't exist yet, proceed to signup
     return false;
    }
}

async function doSignUp(page: Page): Promise<void> {
  await page.goto('/auth');
  await page.locator('#username').waitFor({ state: 'visible', timeout: 10_000 });

      // Ensure we're on Sign Up tab (check heading)
  const heading = page.locator('[data-testid="auth-heading"]');
  if ((await heading.textContent())?.trim() === 'Sign In') {
       // We're in Sign In mode, toggle to Sign Up
    await page.getByText('Sign Up').click();
     }

     	// Fill and submit sign up form
  await page.locator('#username').fill(TEST_USER.username);
  await page.locator('#password').fill(TEST_USER.password);
  await page.locator('#confirmPassword').fill(TEST_USER.password);
  await page.getByRole('button', { name: 'Sign Up' }).click();

        // Sign up auto-logs in — wait for profile username to appear
  await page.locator('[data-testid="profile-username"]').waitFor({ state: 'visible', timeout: 8_000 });
}

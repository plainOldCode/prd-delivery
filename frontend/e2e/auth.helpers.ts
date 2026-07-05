// e2e/auth.helpers.ts — 인증 공통 헬퍼 (bench.spec.ts, auth.spec.ts에서 재사용)
import { Page } from '@playwright/test';

/** E2E 테스트 전용 계정 — 실제 서버가 아닌 in-memory/mock 모임을 대상으로 함 */
const TEST_USER = { username: 'e2e-test', password: 'testPass123!' };

/**
 * 페이지를 로그인 상태로 만듭니다.
 * 이미 로그인되어 있으면 패스 (Idempotent)
 */
export async function ensureLoggedIn(page: Page): Promise<void> {
  await page.goto('/auth');

  // Auth form이 렌더될 때까지 대기
  await page.locator('#username').waitFor({ state: 'visible', timeout: 15_000 });

  // 이미 로그인되어 있으면 스킵 (프로필 메뉴가 보이면 skip)
  if (await page.locator('[data-testid="profile-username"]').isVisible()) {
    return;
  }

  const usernameInput = page.getByLabel('Username');
  const passwordInput = page.getByLabel('Password', { exact: true });
  const confirmInput = page.getByLabel('Confirm Password');
  const submitBtn = page.getByRole('button', { name: /Sign Up|Sign In/ }).first();

  // Sign Up 모드로 전환 (Try-Catch로 이미 모드일 경우 에러 방지)
  if (await confirmInput.isVisible()) {
    // Already in Sign Up mode — just fill and submit
    await usernameInput.fill(TEST_USER.username);
    await passwordInput.fill(TEST_USER.password);
    await confirmInput.fill(TEST_USER.password);
    await submitBtn.click();
  } else {
    // Toggle to Sign Up first
    const toggle = page.getByRole('button', { name: 'Sign Up' });
    if (await toggle.isVisible()) {
      await toggle.click();
      await page.locator('[data-testid="auth-heading"]').waitFor({ state: 'visible' });
    }
    await usernameInput.fill(TEST_USER.username);
    await passwordInput.fill(TEST_USER.password);
    await confirmInput.waitFor({ state: 'visible' });
    await confirmInput.fill(TEST_USER.password);
    await submitBtn.click();
  }

  // 로그인 성공 확인 — 프로필 메뉴가 보일 때까지 대기
  await page.locator('[data-testid="profile-username"]').waitFor({ state: 'visible', timeout: 15_000 });
}

export { TEST_USER };

// playwright.config.ts — E2E 테스트 설정 (Playwright)
import { defineConfig } from '@playwright/test';

/**
 * CI vs Local 동작 분리:
 * - CI: test-runner.sh가 백그라운드에서 Backend(8080) + Frontend(3000) 서버를 기동
        → webServer는 비활성화 (external-started server 가정)
 * - Local: playwright config 자체에 baseURL만 있어서 dev sever 수동 또는 별도 스크립트 필요
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    },
  fullyParallel: !process.env.CI,
  serial: !!process.env.CI,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    video: process.env.CI ? 'retain-on-failure' : 'off',
   },

  // CI에서는 webServer 비활성화 (test-runner.sh가 서버를 기동함)
  ...(process.env.CI ? {} : {
    webServer: {
       command: 'npx vite build && npx vite preview --port 3000',
      port: 3000,
     timeout: 60_000,
     },
   }),

	// CI에서는 chromium만 실행 (firefox/webkit 브라우저 미설치)
	projects: [
    	{ name: 'chromium', use: { browserName: 'chromium' } as any },
    ],
});

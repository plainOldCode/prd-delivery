// e2e/playwright.config.ts — E2E 테스트 설정 (Playwright)
import { defineConfig } from '@playwright/test';

/**
 * baseURL는 test-runner.sh에서 Vite dev server를 백그라운드로 올리고
 * 환경변수 playwright.config.json을 덮어씁니다. 여기서는 기본값만 정의합니다.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
   },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    video: process.env.CI ? 'retain-on-failure' : 'off',
   },

     // Vite dev server를 playwright가 직접 시작 (Backend proxy 자동 매핑)
  webServer: {
       // Vite가 backend /api를 프록시하므로 frontend 서버만 기동하면 됨
    command: 'npx vite build && npx vite preview --port 3000',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
     // Health check — /가 200을 반환하면 ready 판단
    url: 'http://localhost:3000',
   },

   projects: [
     {
       name: 'chromium',
       use: { browserName: 'chromium' },
     },
     ...(process.env.CI ? [
       {
         name: 'firefox',
         use: { browserName: 'firefox' },
       },
       {
         name: 'webkit',
         use: { browserName: 'webkit' },
       },
     ] : []),
   ],
});

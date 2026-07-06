// playwright.config.ts — E2E 테스트 설정 (Playwright)
import { defineConfig } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
   testDir: './e2e',
  timeout: 60_000,
   expect: {
      timeout: 10_000,
        },
  fullyParallel: !isCI,
    forbidOnly: isCI,
  retries: isCI ? 1 : 0,
    workers: isCI ? 1 : 1,
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : 'list',
   use: {
     baseURL: 'http://localhost:3000',
      trace: 'retain-on-failure',
    video: isCI ? 'retain-on-failure' : 'off',
        },

     // CI: test-runner.sh가 서버를 기동하므로 비활성화
    ...(isCI ? {} : {
     globalSetup: './e2e/global-setup.cjs',
     globalTeardown: './e2e/global-teardown.cjs',
     webServer: {
         command: 'npx vite build && npx vite preview --port 3000',
        port: 3000,
       timeout: 60_000,
      env: { VITE_API_URL: 'http://localhost:8080/api' },
          },
      }),

    projects: [
        { name: 'chromium', use: { browserName: 'chromium' } as any },
       ],
});

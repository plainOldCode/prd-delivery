// playwright.config.ts — E2E 테스트 설정
import { defineConfig } from '@playwright/test';
import path from 'path';

    // E2E tests assume Frontend dev server running on localhost:3000
    // and Backend API running on localhost:8080 (proxied via Vite /api)
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: {
      // E2E assertions get extra breathing room for benchmark operations
    timeout: 10_000,
     },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    video: process.env.CI ? 'retain-on-failure' : 'off',
      // Headless by default — override with --headed for debugging
    headless: true,
   },

  projects: [
      // Browser matrix — run in CI; locally defaults to Chromium only
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

    // Global setup — ensure dev servers are running before tests
  globalSetup: path.resolve(__dirname, 'e2e/global-setup.ts'),
});

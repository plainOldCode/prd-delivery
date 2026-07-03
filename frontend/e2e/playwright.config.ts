import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'line',
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
   },
  webServer: [
    // Frontend dev server (Vite) on port 5173
    {
      command: 'npx vite',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    // Backend server (Hono + Bun) on port 3001
    {
      command: 'cd ../backend && bun run src/index.ts',
      port: 3001,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});

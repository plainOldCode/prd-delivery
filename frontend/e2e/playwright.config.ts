import { defineConfig } from '@playwright/test';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname    = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '../..');

export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'line',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
   },
  webServer: [
     // Backend — Hono + Bun (in-memory SQLite)
     {
      command: `cd ${projectRoot}/backend && DATABASE_URL="file::memory:" bun run src/index.ts`,
      port: 3001,
      reuseExistingServer: true,
      timeout: 60_000,
      readyCheck: {
        url: 'http://localhost:3001/',
        timeout: 20_000,
        interval: 1_000,
       },
     },
     // Frontend — Vite dev server
     {
      command: `cd ${projectRoot}/frontend && npx vite`,
      port: 5173,
      reuseExistingServer: true,
      timeout: 60_000,
      readyCheck: {
        url: 'http://localhost:5173/',
        timeout: 30_000,
        interval: 1_000,
       },
     },
   ],
});

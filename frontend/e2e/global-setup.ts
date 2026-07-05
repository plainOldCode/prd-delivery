// e2e/global-setup.ts — E2E 테스트 실행 전 준비 작업
import { chromium } from '@playwright/test';

/**
 * Global setup — 브라우저 컨텍스트 캐시 워밍업 등 초기화.
 * 실제 API 서버 health check를 통해 Frontend가 접근 가능한지 확인합니다.
 */
async function globalSetup() {
   // Browser warmup — playwright cache preload
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('/');
  await browser.close();

   // Verify API server is reachable (backend health endpoint)
  try {
    const res = await fetch('http://localhost:8080/api/health');
    if (!res.ok) {
      console.warn('[e2e] Backend health check returned non-OK status:', res.status);
      }
     } catch (err) {
    console.error('[e2e] Backend is not running on port 8080 — tests may fail');
    }

   // Verify Frontend dev server is reachable
  try {
    const res = await fetch('http://localhost:3000');
    if (!res.ok) {
      console.warn('[e2e] Frontend dev server returned non-OK status:', res.status);
      }
     } catch (err) {
    console.error('[e2e] Frontend dev server not running on port 3000');
    }
}

export default globalSetup;

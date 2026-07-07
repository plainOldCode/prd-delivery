// e2e/bench.spec.ts — Benchmark Flow: Model Selection -> Run -> Progress -> Result -> Report
import { test, expect } from '@playwright/test';

test.describe('LLM Benchmark E2E', () => {

	test('Benchmark full cycle: Run to detailed report', async ({ page }) => {
		// 1. Navigate to Benchmark Page
		await page.goto('/bench');
		await expect(page.getByRole('heading', { name: 'Benchmark', exact: true })).toBeVisible();

		// 2. Select a model (find any available model badge)
		await expect(page.locator('text=Loading models…')).toBeHidden({ timeout: 15_000 });
		const modelBadge = page.locator('button').filter({ hasText: /llama|qwen/i }).first();
		await expect(modelBadge).toBeVisible({ timeout: 10_000 });
		const modelName = (await modelBadge.innerText()).trim();
		await modelBadge.click();

		// 3. Start Benchmark
		const startBtn = page.getByRole('button', { name: 'Start Benchmark' });
		await expect(startBtn).toBeEnabled();
		await startBtn.click();

		// 4. Verify Progress — SSE progress 바가 나타나고 "Benchmark 준비 중..."이 다른 메세지로 교체됨
		await expect(page.locator('.text-sm.font-mono').first())
			.not.toContainText('Benchmark 준비 중...', { timeout: 30_000 });

		// Wait until result panel appears (completed state)
		const resultPanel = page.locator('h3').filter({ hasText: new RegExp(modelName, 'i') });
		await expect(resultPanel).toBeVisible({ timeout: 60_000 });

		// 5. Verify Summary Metrics are rendered in the result panel
		await expect(page.getByText(/Prompt TPS/)).toBeVisible();
		await expect(page.getByText(/Gen TPS/)).toBeVisible();

		// 6. Click "View Full Report" → Navigate to /results/:id page
		const viewReportBtn = page.getByRole('button', { name: 'View Full Report' });
		if (await viewReportBtn.isVisible()) {
			await viewReportBtn.click();
			await expect(page).toHaveURL(/\/results\/\d+/, { timeout: 5_000 });
			const detailHeading = page.getByTestId('bench-detail-heading');
			await expect(detailHeading).toBeVisible({ timeout: 10_000 });
			await expect(detailHeading).toContainText(modelName);
		} else {
			console.log('Note: View Full Report button not found, skipping detail page navigation');
		}
	});
});

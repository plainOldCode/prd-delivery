import { describe, it, expect, beforeEach } from 'bun:test';
import { app } from '../index';
import db from '../db/client';

describe('Agent API (no auth required)', () => {
	beforeEach(async () => {
		await db`DELETE FROM bench_tests`;
		await db`DELETE FROM bench_runs`;
	});

	it('GET /api/agent/models/suitable returns 200 (no auth needed)', async () => {
		const res = await app.request(new Request('http://localhost/api/agent/models/suitable'));
		expect(res.status).toBe(200);
	});

	it('GET /api/agent/bench/recent returns 200 (no auth needed)', async () => {
		const res = await app.request(new Request('http://localhost/api/agent/bench/recent'));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.count).toBe(0);
	});

	it('POST /api/agent/bench/run/compact rejects missing model', async () => {
		const res = await app.request('/api/agent/bench/run/compact', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({}),
		});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toContain('model is required');
	});

	it('POST /api/agent/bench/run/compact rejects disallowed baseUrl (SSRF)', async () => {
		const res = await app.request('/api/agent/bench/run/compact', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ model: 'test-model', baseUrl: 'http://169.254.169.254/latest/meta-data' }),
		});
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.error).toContain('Allowed URLs');
	});

	it('GET /api/agent/bench/recommend rejects invalid task', async () => {
		const res = await app.request('/api/agent/bench/recommend');
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toContain('task required');
	});

	it('POST /api/agent/bench/score rejects missing runId', async () => {
		const res = await app.request('/api/agent/bench/score', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({}),
		});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toContain('runId is required');
	});

	it('POST /api/agent/bench/compare rejects missing ids', async () => {
		const res = await app.request('/api/agent/bench/compare', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({}),
		});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toContain('ids');
	});
});

describe('Composite Score Calculation', () => {

	it('POST /api/agent/bench/score returns 404 for non-existent run', async () => {
		const res = await app.request('/api/agent/bench/score', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ runId: 9999 }),
		});
		expect(res.status).toBe(404);
	});
});

describe('SSRF protection on bench routes', () => {
	it('POST /api/bench/speed rejects disallowed baseUrl', async () => {
		const res = await app.request('/api/bench/speed', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ model: 'test', baseUrl: 'http://169.254.169.254' }),
		});
		expect(res.status).toBe(403);
	});

	it('POST /api/bench/run rejects disallowed baseUrl', async () => {
		const res = await app.request('/api/bench/run', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ model: 'test', baseUrl: 'http://169.254.169.254' }),
		});
		expect(res.status).toBe(403);
	});
});

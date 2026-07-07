import { describe, it, expect, beforeEach } from 'bun:test';
import { app } from '../index';

const uid = Date.now().toString(36);

describe('Agent API Security (P0)', () => {
	let token: string;

	beforeEach(async () => {
		const uname = `bench_${uid}`;
		const pwd = 's3cret';
		await app.request('/api/auth/signup', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ username: uname, password: pwd, confirmPassword: pwd }),
		});
		const loginRes = await app.request('/api/auth/signin', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ username: uname, password: pwd }),
		});
		token = (await loginRes.json() as { token: string }).token;
	});

	it('GET /api/agent/models/suitable rejects without auth', async () => {
		const res = await app.request(new Request('http://localhost/api/agent/models/suitable'));
		expect(res.status).toBe(401);
	});

	it('GET /api/agent/models/suitable accepts with auth', async () => {
		const res = await app.request('/api/agent/models/suitable', {
			headers: { authorization: `Bearer ${token}` },
		});
		expect(res.status).toBe(200);
	});

	it('GET /api/agent/bench/recent rejects without auth', async () => {
		const res = await app.request(new Request('http://localhost/api/agent/bench/recent'));
		expect(res.status).toBe(401);
	});

	it('POST /api/agent/bench/run/compact rejects without auth', async () => {
		const res = await app.request('/api/agent/bench/run/compact', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ model: 'test-model' }),
		});
		expect(res.status).toBe(401);
	});

	it('POST /api/agent/bench/run/compact rejects disallowed baseUrl (SSRF)', async () => {
		const res = await app.request('/api/agent/bench/run/compact', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ model: 'test-model', baseUrl: 'http://169.254.169.254/latest/meta-data' }),
		});
		expect(res.status).toBe(403);
		const body = (await res.json()) as { error: string };
		expect(body.error).toContain('Allowed URLs');
	});

	it('GET /api/agent/bench/recommend rejects without auth', async () => {
		const res = await app.request(new Request('http://localhost/api/agent/bench/recommend?task=coding'));
		expect(res.status).toBe(401);
	});

	it('POST /api/agent/bench/score rejects without auth', async () => {
		const res = await app.request('/api/agent/bench/score', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ runId: 1 }),
		});
		expect(res.status).toBe(401);
	});

	it('POST /api/agent/bench/compare rejects without auth', async () => {
		const res = await app.request('/api/agent/bench/compare', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ ids: [1, 2] }),
		});
		expect(res.status).toBe(401);
	});

	it('Agent endpoints accept valid token', async () => {
		const models = await app.request('/api/agent/models/suitable', {
			headers: { authorization: `Bearer ${token}` },
		});
		expect(models.status).toBe(200);

		const recent = await app.request('/api/agent/bench/recent?limit=5', {
			headers: { authorization: `Bearer ${token}` },
		});
		expect(recent.status).toBe(200);

		const recommend = await app.request('/api/agent/bench/recommend?task=coding', {
			headers: { authorization: `Bearer ${token}` },
		});
		expect(recommend.status).toBe(200);
	});

	it('Agent endpoints reject expired token', async () => {
		const res = await app.request('/api/agent/models/suitable', {
			headers: { authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjE.expired' },
		});
		expect(res.status).toBe(401);
	});

	it('POST /api/agent/bench/run/compact rejects missing model', async () => {
		const res = await app.request('/api/agent/bench/run/compact', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({}),
		});
		expect(res.status).toBe(400);
		const body = (await res.json()) as { error: string };
		expect(body.error).toContain('model is required');
	});

	it('POST /api/agent/bench/score rejects missing runId', async () => {
		const res = await app.request('/api/agent/bench/score', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({}),
		});
		expect(res.status).toBe(400);
		const body = (await res.json()) as { error: string };
		expect(body.error).toContain('runId is required');
	});

	it('POST /api/agent/bench/compare rejects missing ids', async () => {
		const res = await app.request('/api/agent/bench/compare', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({}),
		});
		expect(res.status).toBe(400);
		const body = (await res.json()) as { error: string };
		expect(body.error).toContain('ids');
	});

	it('GET /api/agent/bench/recommend rejects invalid task', async () => {
		const res = await app.request('/api/agent/bench/recommend', {
			headers: { authorization: `Bearer ${token}` },
		});
		expect(res.status).toBe(400);
		const body = (await res.json()) as { error: string };
		expect(body.error).toContain('task required');
	});
});

describe('Composite Score Calculation', () => {
	let token: string;

	beforeEach(async () => {
		const uname = `bench_comp_${uid}`;
		const pwd = 's3cret';
		await app.request('/api/auth/signup', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ username: uname, password: pwd, confirmPassword: pwd }),
		});
		const loginRes = await app.request('/api/auth/signin', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ username: uname, password: pwd }),
		});
		token = (await loginRes.json() as { token: string }).token;
	});

	it('POST /api/agent/bench/score returns 404 for non-existent run', async () => {
		const res = await app.request('/api/agent/bench/score', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ runId: 9999 }),
		});
		expect(res.status).toBe(404);
	});
});

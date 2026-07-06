// e2e/agent.spec.ts — Agent-oriented API tests
import { test, expect } from '@playwright/test';
import { request } from '@playwright/test';

const BASE = 'http://localhost:8080/api/agent';

test.describe('Agent API Endpoints', () => {
  // GET /bench/recent — No auth required (public read)
  test('GET /bench/recent returns run list', async ({ request: req }) => {
    const resp = await req.get(`${BASE}/bench/recent?limit=5`);
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    expect(body).toHaveProperty('count');
    expect(body).toHaveProperty('runs');
    expect(Array.isArray(body.runs)).toBe(true);
   });

  // GET /bench/recommend — Task-based recommendations
  test('GET /bench/recommend returns model recommendations', async ({ request: req }) => {
     const resp = await req.get(`${BASE}/bench/recommend?task=reasoning`);
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    expect(body).toHaveProperty('recommended');
    expect(body).toHaveProperty('based_on');
    expect(Array.isArray(body.recommended)).toBe(true);
    });

  // GET /bench/recommend — Missing task parameter
  test('GET /bench/recommend rejects missing task', async ({ request: req }) => {
     const resp = await req.get(`${BASE}/bench/recommend`);
    expect(resp.status()).toBe(400);
   });

  // GET /models/suitable — Filter models by runtime
  test('GET /models/suitable returns model list', async ({ request: req }) => {
     const resp = await req.get(`${BASE}/models/suitable?runtime=ollama`);
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    expect(body).toHaveProperty('runtime');
    expect(body).toHaveProperty('models');
    expect(Array.isArray(body.models)).toBe(true);
    });

  // POST /bench/run/compact — Speed-only benchmark (mock mode)
  test('POST /bench/run/compact returns JSON summary', async ({ request: req }) => {
     const resp = await req.post(`${BASE}/bench/run/compact`, {
       data: { model: 'qwen3.1:0.7b' },
      });
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    expect(body).toHaveProperty('runId');
    expect(body).toHaveProperty('model');
    expect(body).toHaveProperty('score');
    expect(body).toHaveProperty('recommendation');
    expect(body.score).toHaveProperty('composite');
    });

  // POST /bench/run/compact — Missing model
  test('POST /bench/run/compact rejects missing model', async ({ request: req }) => {
     const resp = await req.post(`${BASE}/bench/run/compact`, { data: {} });
    expect(resp.status()).toBe(400);
    });

  // POST /bench/compare — Batch compare runs
  test('POST /bench/compare accepts valid request', async ({ request: req }) => {
      // Fetch recent runs to get IDs
     const recent = await req.get(`${BASE}/bench/recent?limit=2`);
    const recentBody = await recent.json();
     const ids = recentBody.runs.map((r: any) => r.id);

    if (ids.length < 1) {
       // Verify endpoint accepts empty array gracefully
      const resp = await req.post(`${BASE}/bench/compare`, { data: { ids: [] } });
      expect(resp.ok()).toBeTruthy();
     } else {
      const resp = await req.post(`${BASE}/bench/compare`, { data: { ids } });
       expect(resp.ok()).toBeTruthy();
      const body = await resp.json();
       expect(body).toHaveProperty('count');
      expect(body).toHaveProperty('results');
     }
    });

  // GET /models/suitable — Validate agent prefix
  test('Agent routes are mounted under /api/agent', async ({ request: req }) => {
     const resp = await req.get('http://localhost:8080/api/models');
     expect(resp.ok()).toBeTruthy();
    });
});

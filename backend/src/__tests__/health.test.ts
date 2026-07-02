// Health endpoint unit test
import { describe, it, expect } from 'vitest';
import { healthRoutes } from '../routes/health.js';
import { Hono } from 'hono';

const app = new Hono();
app.route('/api', healthRoutes);

describe('Health Endpoint', () => {
  it('GET /api/health returns ok', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('prd-delivery-backend');
  });
});

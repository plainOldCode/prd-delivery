// src/routes/health.ts — Health check endpoint
import { Hono } from 'hono';

const healthRoutes = new Hono();

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  uptime: number;
}

const startTime = Date.now();

healthRoutes.get('/health', (c) => {
  const response: HealthResponse = {
    status: 'ok',
    service: 'prd-delivery-backend',
    version: '0.1.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
  };
  return c.json(response, 200);
});

export { healthRoutes };

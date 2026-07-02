// src/index.ts — Entry point
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from 'bun';

const app = new Hono();

// Global middleware
app.use('*', cors());
app.use('*', logger());

// Root endpoint
app.get('/', (c) => c.json({ service: 'prd-delivery-backend', version: '0.1.0', status: 'running' }));

/* ------------------------------------------------------------------ */
/*  Routes                                                              */
/* ------------------------------------------------------------------ */
import * as healthRoutes from './routes/health';
import { taskRoutes } from './routes/tasks';
import { authRoutes } from './routes/auth';
app.route('/api', healthRoutes.healthRoutes);
app.route('/api', taskRoutes);
app.route('/api', authRoutes);

export { app };

/* ------------------------------------------------------------------ */
/*  Start only when run directly                                        */
/* ------------------------------------------------------------------ */
async function start() {
  const { initDb } = await import('./db/client');
  await initDb();

  const port = parseInt(process.env.PORT ?? '3000', 10);
  serve({ fetch: (request) => app.fetch(request), port });
  console.log(`[Hono] Listening on http://localhost:${port}`);
}

// Bun runtime only
// @ts-ignore – import.meta.main is supported by Bun
if (import.meta.main) start();

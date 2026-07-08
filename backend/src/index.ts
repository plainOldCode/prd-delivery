// src/index.ts — Entry point (LLM Benchmark tool, no auth)
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from 'bun';

const app = new Hono();

// Global middleware
const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(',');
app.use('*', cors({ origin: allowedOrigins }));
app.use('*', logger());

// Root endpoint
app.get('/', (c) => c.json({ service: 'llm-bench', version: '0.2.0', status: 'running' }));

/* ------------------------------------------------------------------ */
/*  Routes                                                                     */
/* ------------------------------------------------------------------ */
import * as healthRoutes from './routes/health';
import { taskRoutes } from './routes/tasks';
import benchRoutes from './routes/bench';
import agentRoutes from './routes/bench-agent';
app.route('/api', healthRoutes.healthRoutes);
app.route('/api', taskRoutes);
app.route('/api', benchRoutes);
app.route('/api/agent', agentRoutes);

export { app };

/* ------------------------------------------------------------------ */
/*  Start only when run directly                                                 */
/* ------------------------------------------------------------------ */
async function start() {
  const { initDb, ensureIndexes } = await import('./db/client');
  await initDb();
  await ensureIndexes();

  const port = parseInt(process.env.PORT ?? '3001', 10);
  serve({ fetch: (request) => app.fetch(request), port });
  console.log(`[Hono] Listening on http://localhost:${port}`);
}

// Bun runtime only
// @ts-ignore – import.meta.main is supported by Bun
if (import.meta.main) start();

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from 'bun';

const app = new Hono();

// Global middleware
app.use('*', cors());
app.use('*', logger());

// Root endpoint
app.get('/', async (c) => {
  return c.json({
    service: 'prd-delivery-backend',
    version: '0.1.0',
    status: 'running'
  });
});

/* ------------------------------------------------------------------ */
/*  Routes - imported per domain as the scaffold grows                   */
/* ------------------------------------------------------------------ */
import * as healthRoutes from './routes/health';
import { taskRoutes } from './routes/tasks';
app.route('/api', healthRoutes.healthRoutes);
app.route('/api', taskRoutes);

/* ------------------------------------------------------------------ */
/*  Start                                                               */
/* ------------------------------------------------------------------ */

const port = parseInt(Bun.env.PORT ?? '3000', 10);

import { initDb } from './db/client';

// Initialize database before starting server
await initDb();

export default serve({
  fetch: (request, server) => app.fetch(request, server),
  port,
});

console.log(`[Hono] Listening on http://localhost:${port}`);

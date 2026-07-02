// src/routes/tasks.ts — Task CRUD (Bun SQL)
import { Hono } from 'hono';
import db from '../db/client.js';

const taskRoutes = new Hono();

// GET /tasks
taskRoutes.get('/tasks', async (c) => {
  const rows = await db`SELECT * FROM sample_task ORDER BY id ASC`;
  return c.json(rows);
});

// GET /tasks/:id
taskRoutes.get('/tasks/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const [row] = await db`SELECT * FROM sample_task WHERE id = ${id}`;
  if (!row) return c.json({ error: 'not found' }, 404);
  return c.json(row);
});

// POST /tasks
taskRoutes.post('/tasks', async (c) => {
  const body = await c.req.json();
  await db`INSERT INTO sample_task (title, status, customer_request, requested_work, target_delivery_date, build_estimate, owner_name)
    VALUES (${body.title}, ${body.status ?? 'backlog'}, ${body.customer_request}, ${body.requested_work}, ${body.target_delivery_date}, ${body.build_estimate}, ${body.owner_name})`;
  return c.json({ created: true }, 201);
});

// PUT /tasks/:id
taskRoutes.put('/tasks/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json();
  await db`UPDATE sample_task SET title=${body.title}, status=${body.status}, customer_request=${body.customer_request},
    requested_work=${body.requested_work}, target_delivery_date=${body.target_delivery_date},
    build_estimate=${body.build_estimate}, owner_name=${body.owner_name} WHERE id=${id}`;
  return c.json({ updated: true });
});

// DELETE /tasks/:id
taskRoutes.delete('/tasks/:id', async (c) => {
  const id = Number(c.req.param('id'));
  await db`DELETE FROM sample_task WHERE id = ${id}`;
  return c.json({ deleted: true });
});

export { taskRoutes };
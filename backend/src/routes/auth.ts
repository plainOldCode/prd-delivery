// src/routes/auth.ts — Authentication routes (signup / signin / signout)

import { Hono, MiddlewareHandler } from 'hono';
import db from '../db/client.js';
import { hashPassword, verifyPassword, generateToken, verifyToken } from '../services/auth.js';

// ── Reusable auth middleware for protected routes ──────────────────────

export const requireAuth: MiddlewareHandler = async (c, next) => {
	const authHeader = c.req.header('authorization');
	if (!authHeader?.startsWith('Bearer ')) {
		return c.json({ error: 'missing or invalid authorization header' }, 401);
	}
	const token = authHeader.slice(7);
	try {
		const payload = await verifyToken(token);
		c.set('user', payload as { id: number; username: string });
		await next();
	} catch {
		return c.json({ error: 'invalid or expired token' }, 401);
	}
};

const authRoutes = new Hono();

// POST /auth/signup
authRoutes.post('/auth/signup', async (c) => {
  const body = await c.req.json<{ username: string; password: string; confirmPassword: string }>();

  if (!body.username || !body.password || !body.confirmPassword) {
    return c.json({ error: 'username, password and confirmPassword are required' }, 400);
   }

  if (body.password !== body.confirmPassword) {
    return c.json({ error: 'passwords do not match' }, 400);
   }

  const existing = await db`SELECT id FROM users WHERE username = ${body.username} COLLATE NOCASE`;
  if (existing.length > 0) {
    return c.json({ error: 'username already taken' }, 409);
   }

  const passwordHash = await hashPassword(body.password);
  const result = await db`INSERT INTO users (username, password_hash) VALUES (${body.username}, ${passwordHash})`;
  const token = await generateToken({ id: Number(result.lastInsertRowid), username: body.username });

  return c.json({ id: Number(result.lastInsertRowid), username: body.username, token }, 201);
});

// POST /auth/signin
authRoutes.post('/auth/signin', async (c) => {
  const body = await c.req.json<{ username: string; password: string }>();

  if (!body.username || !body.password) {
    return c.json({ error: 'username and password are required' }, 400);
   }

  const [user] = await db`SELECT id, username, password_hash FROM users WHERE username = ${body.username} COLLATE NOCASE`;
  if (!user) {
    return c.json({ error: 'invalid credentials' }, 401);
   }

  const valid = await verifyPassword(user.password_hash, body.password);
  if (!valid) {
    return c.json({ error: 'invalid credentials' }, 401);
   }

  const token = await generateToken({ id: Number(user.id), username: user.username });
  return c.json({ token });
});

// POST /auth/signout
authRoutes.post('/auth/signout', requireAuth, (c) => c.json({ message: 'signed out successfully' }));

export { authRoutes };

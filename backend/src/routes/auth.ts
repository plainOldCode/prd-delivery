// src/routes/auth.ts — Authentication routes (signup / signin / signout)

import { Hono } from 'hono';
import db from '../db/client.js';
import { hashPassword, verifyPassword, generateToken, verifyToken } from '../services/auth.js';

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

  return c.json({ id: Number(result.lastInsertRowid), username: body.username }, 201);
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
authRoutes.post('/auth/signout', async (c) => {
  const authHeader = c.req.header('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'missing or invalid authorization header' }, 401);
  }

  const token = authHeader.slice(7);
  try {
    await verifyToken(token);
    // In a stateless JWT setup, signout is client-side (discard the token).
    // Server-side we just confirm the token was valid.
    return c.json({ message: 'signed out successfully' });
  } catch {
    return c.json({ error: 'invalid or expired token' }, 401);
  }
});

export { authRoutes };

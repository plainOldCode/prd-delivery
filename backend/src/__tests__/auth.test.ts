import { describe, it, expect } from 'bun:test';
import { app } from '../index';

const uid = Date.now().toString(36); // unique per test run → no stale-user collisions

describe('Auth Flow', () => {
  const uname = `u_${uid}`;
  const pwd = 's3cret';

  it('signup returns 201 with user data', async () => {
    const r = await app.request('/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: uname, password: pwd, confirmPassword: pwd }),
     });
    expect(r.status).toBe(201);
    const b = await r.json();
    expect(b.id).toBeDefined();
    expect(b.username).toBe(uname);
   });

  it('signup rejects duplicate username', async () => {
    const r = await app.request('/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: uname, password: pwd, confirmPassword: pwd }),
     });
    expect(r.status).toBe(409);
   });

  it('signup rejects mismatched passwords', async () => {
    expect((await app.request('/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: `x_${uid}`, password: 'a', confirmPassword: 'b' }),
     })).status).toBe(400);
   });

  it('signin returns jwt token', async () => {
    const r = await app.request('/api/auth/signin', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: uname, password: pwd }),
     });
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(typeof b.token).toBe('string');
   });

  it('signin rejects wrong password', async () => {
    expect((await app.request('/api/auth/signin', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: uname, password: 'wrong' }),
     })).status).toBe(401);
   });

  it('signin rejects nonexistent user', async () => {
    expect((await app.request('/api/auth/signin', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'nobody', password: 'pass' }),
     })).status).toBe(401);
   });

  it('signout accepts valid token', async () => {
    const login = await app.request('/api/auth/signin', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: uname, password: pwd }),
     });
    const { token } = await login.json();
    expect((await app.request('/api/auth/signout', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      })).status).toBe(200);
   });

  it('signout rejects invalid token', async () => {
    expect((await app.request('/api/auth/signout', {
      method: 'POST',
      headers: { authorization: 'Bearer fake.bad.sig' },
     })).status).toBe(401);
   });
});

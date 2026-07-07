import { describe, it, expect } from 'bun:test';
import { app } from '../index.js';

describe('API Smoke Tests', () => {
  function req(method?: string) {
    return (path: string, init?: RequestInit) => {
      const r = app.request(path, { ...(method ? { method } : {}), ...init });
      if (typeof (r as any).then === 'function') return r;
      return Promise.resolve(r);
   };
  }

  const get   = req('GET');
  const post  = req('POST');
  const put   = req('PUT');
  const del   = req('DELETE');

  it('GET / returns service info', async () => {
    const json: any = await (await get('/')).json();
    expect(json.service).toBe('llm-bench');
   });

  it('GET /api/health returns ok', async () => {
    const json: any = await (await get('/api/health')).json();
    expect(json.status).toBe('ok');
   });

  it('CRUD cycle: create, read, update, delete', async () => {
     // Clean slate
    for (const t of (await (await get('/api/tasks')).json()) as any[]) await del(`/api/tasks/${t.id}`);

     // Create
    const createRes = await post('/api/tasks', {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'e2e test', customer_request: 'smoke test' }),
     });
    expect(createRes.status).toBe(201);

     // Read list + single
    const list = (await (await get('/api/tasks')).json()) as any[];
    expect(list.length).toBe(1);
    const detailRes = await get(`/api/tasks/${list[0].id}`);
    const detail: any = await (detailRes as Response).json();
    expect(detail.title).toBe('e2e test');

     // Update
    const updateRes = await put(`/api/tasks/${list[0].id}`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'done', status: 'completed' }),
     });
    expect(updateRes.status).toBe(200);

     // Not found + Delete
    expect((await get('/api/tasks/99999')).status).toBe(404);
    await del(`/api/tasks/${list[0].id}`);
    const empty = (await (await get('/api/tasks')).json()) as any[];
    expect(empty.length).toBe(0);
      });
});

import { describe, it, expect } from 'vitest';

const baseUrl = 'http://localhost:3001';

describe('API Smoke Tests', () => {
  it('GET / returns service info', async () => {
    const res = await fetch(baseUrl);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.service).toBe('prd-delivery-backend');
   });

  it('GET /api/health → ok', async () => {
    const json = await fetch(`${baseUrl}/api/health`).then((r) => r.json());
    expect(json.status).toBe('ok');
   });

  it('CRUD cycle: create → read → update → delete', async () => {
    // List (may have leftovers from prior runs — clean first)
    let tasks = await fetch(`${baseUrl}/api/tasks`).then((r) => r.json());
    for (const t of tasks) {
      await fetch(`${baseUrl}/api/tasks/${t.id}`, { method: 'DELETE' });
     }

    // Create
    const createRes = await fetch(`${baseUrl}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'e2e test', customer_request: 'vitest smoke' }),
     });
    expect(createRes.status).toBe(201);

    // Read list
    let list = await fetch(`${baseUrl}/api/tasks`).then((r) => r.json());
    expect(list.length).toBe(1);
    expect(list[0].title).toBe('e2e test');

    // Read single
    const detail = await fetch(`${baseUrl}/api/tasks/${list[0].id}`).then((r) => r.json());
    expect(detail.title).toBe('e2e test');

    // Update
    const updateRes = await fetch(`${baseUrl}/api/tasks/${list[0].id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'done', status: 'completed' }),
     });
    expect(updateRes.status).toBe(200);

    // Not found
    const nf = await fetch(`${baseUrl}/api/tasks/99999`);
    expect(nf.status).toBe(404);

    // Delete
    const delRes = await fetch(`${baseUrl}/api/tasks/${list[0].id}`, { method: 'DELETE' });
    expect(delRes.status).toBe(200);

    // Empty again
    list = await fetch(`${baseUrl}/api/tasks`).then((r) => r.json());
    expect(list.length).toBe(0);
   });
});
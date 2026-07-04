import { describe, it, expect } from 'bun:test';
import { app } from '../index';
import db from '../db/client';

describe('LLM Benchmark API', () => {
    it('GET /api/models returns available models', async () => {
        const res = await app.request(new Request('http://localhost/api/models'));
        expect(res.status).toBe(200);
    });

    it('POST /api/bench/run executes full suite and saves to DB', async () => {
        const createReq = new Request('http://localhost/api/bench/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'llama3:8b' }),
        });
        const createRes = await app.request(createReq);
        expect(createRes.status).toBe(201);
    });

    it('GET /api/bench/:id returns run details and tests', async () => {
        // Using a simple ID if rowid is not behaving as expected in the test env
        await db`INSERT INTO bench_runs (rowid, model_name, hardware, runtime, speed_prompt_tps, speed_gen_tps, speed_ttft_ms, retention_pct, accuracy_pct)
          VALUES (10, 'test-model', 'M2 Max', 'ollama', 10.0, 20.0, 300, 80, 90)`;
        
        const res = await app.request(new Request(`http://localhost/api/bench/10`));
        expect(res.status).toBe(200);
    });

    it('DELETE /api/bench/:id removes run and tests', async () => {
        await db`INSERT INTO bench_runs (rowid, model_name, hardware, runtime, speed_prompt_tps, speed_gen_tps, speed_ttft_ms, retention_pct, accuracy_pct)
          VALUES (20, 'del-model', 'M2 Max', 'ollama', 1.0, 1.0, 1.0, 1.0, 1.0)`;
        
        const delRes = await app.request(new Request(`http://localhost/api/bench/20`, { method: 'DELETE' }));
        expect(delRes.status).toBe(200);
        const getRes = await app.request(new Request(`http://localhost/api/bench/20`));
        expect(getRes.status).toBe(404);
    });
});

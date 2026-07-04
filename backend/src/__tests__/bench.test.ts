import { describe, it, expect } from 'bun:test';
import { app } from '../index';
import db from '../db/client';

describe('LLM Benchmark API', () => {
    // SSE 스트리밍 엔드포인트는 201 대신 200을 반환 — Hono/SSE 기본 동작
    it('POST /api/bench/run executes full suite and returns 200 (SSE)', async () => {
        const createReq = new Request('http://localhost/api/bench/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'llama3:8b' }),
        });
        const createRes = await app.request(createReq);
        expect(createRes.status).toBe(200);
    });

    it('GET /api/bench/:id returns run details and tests', async () => {
        // rowid 99로 UNIQUE 값 설정하여 DELETE 테스트(rowid=100)와 충돌 방지
        await db`INSERT INTO bench_runs (rowid, model_name, hardware, runtime, speed_prompt_tps, speed_gen_tps, speed_ttft_ms, retention_pct, accuracy_pct)
          VALUES (99, 'test-model', 'M2 Max', 'ollama', 10.0, 20.0, 300, 80, 90)`;
        const res = await app.request(new Request(`http://localhost/api/bench/99`));
        expect(res.status).toBe(200);
    });

    it('DELETE /api/bench/:id removes run and tests', async () => {
        // rowid 100으로 UNIQUE 값 설정하여 GET 테스트(rowid=99)와 충돌 방지
        await db`INSERT INTO bench_runs (rowid, model_name, hardware, runtime, speed_prompt_tps, speed_gen_tps, speed_ttft_ms, retention_pct, accuracy_pct)
          VALUES (100, 'del-model', 'M2 Max', 'ollama', 1.0, 1.0, 1.0, 1.0, 1.0)`;
        const delRes = await app.request(new Request(`http://localhost/api/bench/100`, { method: 'DELETE' }));
        expect(delRes.status).toBe(200);
        const getRes = await app.request(new Request(`http://localhost/api/bench/100`));
        expect(getRes.status).toBe(404);
    });
});

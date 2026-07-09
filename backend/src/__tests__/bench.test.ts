import { describe, it, expect, beforeEach } from 'bun:test';
import { app } from '../index';
import db from '../db/client';

describe('LLM Benchmark API', () => {
    beforeEach(async () => {
        // Drop tables so initDb recreates with new schema
        await db`DROP TABLE IF EXISTS bench_tests`;
        await db`DROP TABLE IF EXISTS bench_runs`;
        await db`DROP TABLE IF EXISTS sample_task`;
        // Recreate with current schema
        await import('../db/client').then(m => m.initDb());
    });

    it('POST /api/bench/run executes full suite and returns SSE with result event', async () => {
        const res = await app.request(new Request('http://localhost/api/bench/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'llama3:8b' }),
        }));
        expect(res.status).toBe(200);

        // Read SSE stream and verify result event
        if (!res.body) throw new Error('No body');
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let foundResult = false;

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const chunks = buffer.split('\n\n');
            buffer = chunks.pop() || '';
            for (const chunk of chunks) {
                const lines = chunk.split('\n');
                let event = '';
                let dataStr = '';
                for (const line of lines) {
                    if (line.startsWith('event: ')) {
                        event = line.slice(7).trim();
                    } else if (line.startsWith('data: ')) {
                        dataStr = line.slice(6).trim();
                    }
                }
                if (event === 'result' && dataStr) {
                    const payload = JSON.parse(dataStr);
                    expect(payload.model).toBe('llama3:8b');
                    expect(payload.saved).toBe(true);
                    foundResult = true;
                }
            }
        }
        expect(foundResult).toBe(true);
    });

    it('GET /api/bench/:id returns run details with correct fields', async () => {
        await db`INSERT INTO bench_runs (run_id, model_name, runtime, hardware, speed_prompt_tps, speed_gen_tps, speed_ttft_ms, retention_pct, accuracy_pct)
          VALUES ('test-run-1', 'test-model', 'ollama', 'M2 Max', 10.0, 20.0, 300, 80, 90)`;
        const res = await app.request(new Request('http://localhost/api/bench/test-run-1'));
        expect(res.status).toBe(200);
        const body = await res.json() as any;
        expect(body.run.model).toBe('test-model');
        expect(body.run.prompt_tps).toBe(10);
        expect(body.run.gen_tps).toBe(20);
    });

    it('DELETE /api/bench/:id removes run and tests', async () => {
        await db`INSERT INTO bench_runs (run_id, model_name, runtime, hardware, speed_prompt_tps, speed_gen_tps, speed_ttft_ms, retention_pct, accuracy_pct)
          VALUES ('del-run-2', 'del-model', 'ollama', 'M2 Max', 1.0, 1.0, 1.0, 1.0, 1.0)`;
        const delRes = await app.request(new Request('http://localhost/api/bench/del-run-2', { method: 'DELETE' }));
        expect(delRes.status).toBe(200);
        const getRes = await app.request(new Request('http://localhost/api/bench/del-run-2'));
        expect(getRes.status).toBe(404);
    });

    it('GET /api/bench/history returns runs with correct shape', async () => {
        await db`INSERT INTO bench_runs (run_id, model_name, runtime, hardware, speed_prompt_tps, speed_gen_tps, speed_ttft_ms, retention_pct, accuracy_pct)
          VALUES ('hist-run-3', 'hist-model', 'mlx', 'M4', 15.0, 25.0, 150, 95, 88)`;
        const res = await app.request(new Request('http://localhost/api/bench/history'));
        expect(res.status).toBe(200);
        const body = await res.json() as any;
        expect(body.runs.length).toBe(1);
        expect(body.runs[0].model).toBe('hist-model');
        expect(body.runs[0].prompt_tps).toBe(15);
    });
});

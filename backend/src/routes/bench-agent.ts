// src/routes/bench-agent.ts — Agent-oriented benchmark API (JSON-only, no SSE)
import { Hono } from 'hono';
import type { Context } from 'hono';
import db from '../db/client';
import { stubModelList, runSpeedBench, listModels, saveBenchRun } from '../services/bench';
import { computeComposite, recommendModel, compareRuns, ensureIndexes } from '../services/advisor';

const agent = new Hono();

type BenchScore = {
  speed: { gen_tps: number; ttft_ms: number };
  retention: number;
  accuracy: number;
  composite: number;
};

// GET /models/suitable?min_context=N&runtime=X — Filter models by context size
agent.get('/models/suitable', async (c: Context) => {
  const minContext = parseInt(c.req.query('min_context') || '0', 10);
  const runtime = c.req.query('runtime') || 'ollama';

  if (process.env.BENCH_MOCK === 'true') {
    return c.json({ runtime, models: stubModelList() });
  }

  try {
    const all = await listModels();
    // TODO: filter by min_context when model metadata supports it
    const models = minContext > 0 ? all : all;
    return c.json({ runtime, models });
  } catch {
    return c.json({ runtime, models: [] });
  }
});

// POST /bench/run/compact — Run bench, return summary JSON (no SSE, SLM-friendly)
agent.post('/bench/run/compact', async (c: Context) => {
  const body = await c.req.json();
  const model = body.model as string;
  if (!model) return c.json({ error: 'model is required' }, 400);

  try {
    const speedResult = await runSpeedBench(model, body.baseUrl || 'http://localhost:11434');
    await ensureIndexes();
    const hwStr = body.hardware || `${body.runtime || 'ollama'}-unknown`;
    const runId = await saveBenchRun({
      runId: Date.now(), model, hardware: hwStr, runtime: body.runtime || 'ollama',
      promptTps: speedResult.promptTps, genTps: speedResult.genTps, ttftMs: speedResult.ttftMs,
      retentionPct: 0, accuracyPct: 0,
    });
    const composite = computeComposite(
      speedResult.promptTps, speedResult.genTps, speedResult.ttftMs, 0, 0
    );
    const score: BenchScore = {
      speed: { gen_tps: speedResult.genTps, ttft_ms: speedResult.ttftMs },
      retention: 0, accuracy: 0, composite,
    };
    return c.json({ runId, model, score, recommendation: 'speed-only benchmark completed' }, 201);
  } catch (err) {
    return c.json({ error: `Benchmark failed: ${err}` }, 500);
  }
});

// GET /bench/recent?limit=N — Recent runs summary (agent-friendly, compact)
agent.get('/bench/recent', async (c: Context) => {
  const limit = Math.min(parseInt(c.req.query('limit') || '10', 10), 50);
  try {
    const rows = await db`SELECT *, rowid as id FROM bench_runs ORDER BY created_at DESC LIMIT ${limit}`;
    const runs: Array<Record<string, unknown>> = (rows as any) || [];
    return c.json({
      count: runs.length,
      runs: runs.map((r: Record<string, unknown>) => {
        const composite = computeComposite(
          Number(r.speed_prompt_tps), Number(r.speed_gen_tps),
          Number(r.speed_ttft_ms), Number(r.retention_pct), Number(r.accuracy_pct)
        );
        return {
          id: r.id, model: r.model_name, hardware: r.hardware, runtime: r.runtime, created_at: r.created_at,
          score: {
            speed: { gen_tps: r.speed_gen_tps, ttft_ms: r.speed_ttft_ms },
            retention_pct: r.retention_pct, accuracy_pct: r.accuracy_pct,
            composite,
          },
        };
      }),
    });
  } catch (err) {
    return c.json({ count: 0, error: String(err), runs: [] as any[] }, 500);
  }
});

// GET /bench/recommend?task=X&max_cost=Y — Task-based model recommendation
agent.get('/bench/recommend', async (c: Context) => {
  const task = c.req.query('task') as 'coding' | 'math' | 'reasoning';
  const maxCost = c.req.query('max_cost') as 'low' | 'medium' | 'high';
  if (!['coding', 'math', 'reasoning'].includes(task || '')) {
    return c.json({ error: 'task required: coding|math|reasoning' }, 400);
  }
  try {
    const recs = await recommendModel(task as any, maxCost);
    return c.json({ recommended: recs, based_on: recs.length });
  } catch (err) {
    return c.json({ error: String(err), recommended: [] }, 500);
  }
});

// POST /bench/score — Composite score with custom weights
agent.post('/bench/score', async (c: Context) => {
  const body = await c.req.json();
  const runId = parseInt(String(body.runId), 10);
  if (!runId || isNaN(runId)) return c.json({ error: 'runId is required' }, 400);

  try {
    const rows = await db`SELECT *, rowid as id FROM bench_runs WHERE rowid = ${runId} LIMIT 1`;
    const run = ((rows as any) || [])[0] as Record<string, unknown>;
    if (!run) return c.json({ error: 'Run not found' }, 404);

    const weights = { speed: body.speedWeight ?? 0.4, quality: body.qualityWeight ?? 0.6 };
    const composite = computeComposite(
      Number(run.speed_prompt_tps), Number(run.speed_gen_tps),
      Number(run.speed_ttft_ms), Number(run.retention_pct), Number(run.accuracy_pct),
      weights as Parameters<typeof computeComposite>[3]
    );
    return c.json({
      runId: run.id, model: run.model_name,
      score: {
        speed: { gen_tps: run.speed_gen_tps, ttft_ms: run.speed_ttft_ms },
        retention_pct: run.retention_pct, accuracy_pct: run.accuracy_pct,
        composite, weights,
      },
    });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// POST /bench/compare — Batch compare multiple runs by ID
agent.post('/bench/compare', async (c: Context) => {
  const body = await c.req.json();
  const ids = body.ids as number[];
  if (!ids || !Array.isArray(ids)) return c.json({ error: 'ids (number[]) is required' }, 400);

  try {
    const results = await compareRuns(ids);
    const notFound = ids.length - results.length;
    return c.json({
      count: results.length,
      compared: notFound > 0 ? `${notFound} not found` : 'all found',
      results,
    });
  } catch (err) {
    return c.json({ error: String(err), results: [] }, 500);
  }
});

export default agent;

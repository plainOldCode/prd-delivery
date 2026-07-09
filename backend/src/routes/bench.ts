// src/routes/bench.ts — Benchmark API routes
import { Hono } from 'hono';
import { streamText } from 'hono/streaming';
import db from '../db/client';
import { listModels, listModelsMLX, saveBenchRun, runSpeedBench, runRetentionBench, runAccuracyBench, stubModelList, BenchRun } from '../services/bench';
import { detectHardware, stubHardware } from '../services/hardware';

/** SSRF 방지: 허용된 baseUrl만 사용. 명시적으로 전달된 URL이 allowlist에 없으면 403 */
const ALLOWED_BASE_URLS = new Set((process.env.BENCH_ALLOWED_URLS ?? '').split(',').filter(Boolean));
if (ALLOWED_BASE_URLS.size === 0) {
  ALLOWED_BASE_URLS.add('http://localhost:11434');
}
function validateBaseUrl(c: any, input?: string): { baseUrl: string; error?: string; status?: number } {
  const raw = typeof input === 'string' ? input : undefined;
  if (raw && !ALLOWED_BASE_URLS.has(raw)) {
    return { baseUrl: '', error: `Allowed URLs: ${[...ALLOWED_BASE_URLS].join(', ')}`, status: 403 };
  }
  const baseUrl = raw && ALLOWED_BASE_URLS.has(raw) ? raw : (process.env.BENCH_BASE_URL ?? 'http://localhost:11434');
  return { baseUrl };
}

export { validateBaseUrl };

/** CI/E2E에서 LLM 서버가 없으면 stub 데이터로 대체 */
function isMockMode(): boolean {
  return process.env.BENCH_MOCK === 'true' || (process.env.DATABASE_URL?.includes('memory') ?? false);
}

const bench = new Hono();

// GET /api/models — List available models (Ollama or MLX)
bench.get('/models', async (c) => {
  const runtime = c.req.query('runtime') || 'ollama';

  if (isMockMode()) {
    return c.json({ runtime, models: stubModelList() });
  }

  try {
    const models = await (runtime === 'mlx' ? listModelsMLX() : listModels());
    return c.json({ runtime, models });
  } catch {
    return c.json({ runtime, models: stubModelList() });
  }
});

// GET /api/hardware — Detect hardware specs
bench.get('/hardware', async (c) => {
  if (isMockMode()) {
    return c.json(stubHardware());
  }

  try {
    const hw = await detectHardware();
    return c.json(hw);
  } catch {
    return c.json(stubHardware());
  }
});

// POST /api/bench/speed — Run speed benchmark for a model
bench.post('/bench/speed', async (c) => {
  const body = await c.req.json();
  const model = typeof body.model === 'string' ? body.model : null;
  if (!model) return c.json({ error: 'model is required' }, 400);

  const { baseUrl, error, status } = validateBaseUrl(c, body.baseUrl);
  if (error) return c.json({ error }, status!);

  try {
    const result = await runSpeedBench(model, baseUrl);
    const hw = await detectHardware().catch(() => stubHardware());
    const ramGB = Math.round((hw.ramBytes / (1024 ** 3)) * 10) / 10;
    const hardwareLabel = `${hw.chip}, ${hw.cpuCoresPhysical} cores, ${ramGB}GB RAM`;

    const benchRun: BenchRun = {
      runId: crypto.randomUUID(),
      model,
      hardware: hardwareLabel,
      runtime: 'ollama',
      promptTps: result.promptTps,
      genTps: result.genTps,
      ttftMs: result.ttftMs,
      retentionPct: 0,
      accuracyPct: 0,
    };
    await saveBenchRun(benchRun);

    return c.json({ ...result, hardware: hardwareLabel }, 201);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// POST /api/bench/retention — Run context retention benchmark
bench.post('/bench/retention', async (c) => {
  const body = await c.req.json();
  const model = typeof body.model === 'string' ? body.model : null;
  if (!model) return c.json({ error: 'model is required' }, 400);

  const { baseUrl, error, status } = validateBaseUrl(c, body.baseUrl);
  if (error) return c.json({ error }, status!);

  try {
    const result = await runRetentionBench(model, baseUrl);
    return c.json(result);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// POST /api/bench/accuracy — Run accuracy benchmark
bench.post('/bench/accuracy', async (c) => {
  const body = await c.req.json();
  const model = typeof body.model === 'string' ? body.model : null;
  if (!model) return c.json({ error: 'model is required' }, 400);

  const { baseUrl, error, status } = validateBaseUrl(c, body.baseUrl);
  if (error) return c.json({ error }, status!);

  try {
    const result = await runAccuracyBench(model, baseUrl);
    return c.json(result);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// POST /api/bench/run — Run full benchmark suite for a model with SSE progress
bench.post('/bench/run', async (c) => {
  const body = await c.req.json();
  const model = typeof body.model === 'string' ? body.model : null;
  if (!model) return c.json({ error: 'model is required' }, 400);

  const { baseUrl, error, status } = validateBaseUrl(c, body.baseUrl);
  if (error) return c.json({ error }, status!);

  // E2E mock mode: simulate SSE stream with stub data — no Ollama required
  if (isMockMode()) {
    const hw = stubHardware();
    const ramGB = Math.round((hw.ramBytes / (1024 ** 3)) * 10) / 10;
    const hardwareLabel = `${hw.chip}, ${hw.cpuCoresPhysical} cores, ${ramGB}GB RAM`;

    const runId = crypto.randomUUID();
    const benchRun: BenchRun = {
      runId,
      model,
      hardware: hardwareLabel,
      runtime: 'mock',
      promptTps: 12.56,
      genTps: 8.43,
      ttftMs: 200,
      retentionPct: 78,
      accuracyPct: 65,
    };

    // Save mock run and retrieve the actual numeric row id to return in SSE result event.
    try {
      await saveBenchRun(benchRun);
    } catch {
      // ignore — bench_runs may not exist if initDb hasn't been called yet
    }
    const saved = (await db`SELECT MAX(rowid) as latest FROM bench_runs`)[0] as Record<string, unknown> | undefined;
    const latestId = typeof saved?.latest === 'number' ? String(saved.latest) : (Array.isArray(savedRuns ?? []) && savedRuns.length > 0)
      ? String(savedRuns[0].id ?? '')
      : String(runId);

    return streamText(c, async (stream) => {
      const sendEvent = async (event: string, data: object) => {
        await stream.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };

      await sendEvent('progress', { message: 'Initializing benchmark suite...', percent: 10 });
      await new Promise(res => setTimeout(res, 300));
      await sendEvent('progress', { message: `Measuring speed for ${model}...`, percent: 20 });
      await new Promise(res => setTimeout(res, 500));
      await sendEvent('progress', { message: 'Speed test complete.', percent: 40 });
      await new Promise(res => setTimeout(res, 300));
      await sendEvent('progress', { message: `Evaluating context retention for ${model}...`, percent: 50 });
      await new Promise(res => setTimeout(res, 500));
      await sendEvent('progress', { message: 'Retention test complete.', percent: 70 });
      await new Promise(res => setTimeout(res, 300));
      await sendEvent('progress', { message: `Verifying accuracy for ${model}...`, percent: 80 });
      await new Promise(res => setTimeout(res, 500));
      await sendEvent('progress', { message: 'Accuracy test complete.', percent: 95 });

      const resultPayload = {
        runId: latestId ?? null,
        model,
        hardware: hardwareLabel,
        speed: { promptTps: 12.56, genTps: 8.43, ttftMs: 200 },
        retention: { score: 78 },
        accuracy: { score: 65 },
        saved: true,
      };
      await sendEvent('result', resultPayload);
      await new Promise(res => setTimeout(res, 200));
      await sendEvent('progress', { message: 'Benchmark finished!', percent: 100 });
    });
  }

  return streamText(c, async (stream) => {
    const sendEvent = async (event: string, data: object) => {
      const payload = JSON.stringify(data);
      await stream.write(`event: ${event}\ndata: ${payload}\n\n`);
    };

    await sendEvent('progress', { message: 'Initializing benchmark suite...', percent: 10 });

    // Step 1: Speed Bench
    await sendEvent('progress', { message: `Measuring speed for ${model}...`, percent: 20 });
    const speedResult = await runSpeedBench(model, baseUrl).catch((e: Error) => ({ promptTps: 0, genTps: 0, ttftMs: 0, error: e.message }));
    await sendEvent('progress', { message: 'Speed test complete.', percent: 40 });

    // Step 2: Retention Bench
    await sendEvent('progress', { message: `Evaluating context retention for ${model}...`, percent: 50 });
    const retentionResult = await runRetentionBench(model, baseUrl).catch((e: Error) => ({ score: 0, error: e.message }));
    await sendEvent('progress', { message: 'Retention test complete.', percent: 70 });

    // Step 3: Accuracy Bench
    await sendEvent('progress', { message: `Verifying accuracy for ${model}...`, percent: 80 });
    const accuracyResult = await runAccuracyBench(model, baseUrl).catch((e: Error) => ({ score: 0, error: e.message }));
    await sendEvent('progress', { message: 'Accuracy test complete.', percent: 95 });

    // Finalize and Save
    const hw = await detectHardware().catch(() => stubHardware());
    const ramGB = Math.round((hw.ramBytes / (1024 ** 3)) * 10) / 10;
    const hardwareLabel = `${hw.chip}, ${hw.cpuCoresPhysical} cores, ${ramGB}GB RAM`;

    const benchRun: BenchRun = {
      runId: crypto.randomUUID(),
      model,
      hardware: hardwareLabel,
      runtime: 'backend',
      promptTps: speedResult.promptTps ?? 0,
      genTps: speedResult.genTps ?? 0,
      ttftMs: speedResult.ttftMs ?? 0,
      retentionPct: retentionResult.score ?? 0,
      accuracyPct: accuracyResult.score ?? 0,
    };

    const actualRunId = await saveBenchRun(benchRun);

    const finalResult = {
      runId: actualRunId,
      model,
      hardware: hardwareLabel,
      speed: speedResult,
      retention: retentionResult,
      accuracy: accuracyResult,
      saved: true,
    };

    await sendEvent('result', finalResult);
    await sendEvent('progress', { message: 'Benchmark finished!', percent: 100 });
  });
});

// GET /api/bench/history — Get all benchmark runs (latest 50)
bench.get('/bench/history', async (c) => {
  try {
    const rows = await db`SELECT *, rowid as id FROM bench_runs ORDER BY created_at DESC LIMIT 50`;
    const runs = Array.from(rows ?? []).map((r: Record<string, unknown>) => ({
      id: Number(r.id), run_id: String(r.run_id ?? ''), model: String(r.model_name ?? ''), hardware: String(r.hardware ?? ''),
      runtime: String(r.runtime ?? ''), prompt_tps: Number(r.speed_prompt_tps ?? 0), gen_tps: Number(r.speed_gen_tps ?? 0),
      ttft_ms: Number(r.speed_ttft_ms ?? 0), retention_pct: Number(r.retention_pct ?? 0), accuracy_pct: Number(r.accuracy_pct ?? 0), created_at: String(r.created_at ?? '')
    }));
    return c.json({ runs });
  } catch (err) {
    return c.json({ error: String(err), runs: [] }, 200);
  }
});

// GET /api/bench/:id — Lookup by run_id (UUID) with tests
bench.get('/bench/:id', async (c) => {
  const idParam = c.req.param('id');

  // Try integer lookup (rowid) first if numeric ID is passed
  if (/^\d+$/.test(idParam)) {
    const parsedId = Number(idParam);
    try {
      const rows = await db`SELECT * FROM bench_runs WHERE rowid = ${parsedId} LIMIT 1`;
      const runRaw = Array.from(rows ?? [])[0] as Record<string, unknown> | undefined;
      if (!runRaw) return c.json({ error: 'Not found' }, 404);
      const run = {
        id: Number(runRaw.id), run_id: String(runRaw.run_id ?? ''), model: String(runRaw.model_name ?? ''), hardware: String(runRaw.hardware ?? ''),
        runtime: String(runRaw.runtime ?? ''), prompt_tps: Number(runRaw.speed_prompt_tps ?? 0), gen_tps: Number(runRaw.speed_gen_tps ?? 0),
        ttft_ms: Number(runRaw.speed_ttft_ms ?? 0), retention_pct: Number(runRaw.retention_pct ?? 0), accuracy_pct: Number(runRaw.accuracy_pct ?? 0), created_at: String(runRaw.created_at ?? '')
      };
      const tests = await db`SELECT * FROM bench_tests WHERE run_id = ${runRaw.run_id} ORDER BY category, name`;
      return c.json({ run, tests: Array.from(tests ?? []) });
    } catch (err) {
      return c.json({ error: String(err) }, 500);
    }
  }

  // UUID lookup by run_id column
  try {
    const rows = await db`SELECT * FROM bench_runs WHERE run_id = ${idParam} LIMIT 1`;
    const runRaw = Array.from(rows ?? [])[0] as Record<string, unknown> | undefined;
    if (!runRaw) return c.json({ error: 'Not found' }, 404);
    const run = {
      id: Number(runRaw.id), run_id: String(runRaw.run_id ?? ''), model: String(runRaw.model_name ?? ''), hardware: String(runRaw.hardware ?? ''),
      runtime: String(runRaw.runtime ?? ''), prompt_tps: Number(runRaw.speed_prompt_tps ?? 0), gen_tps: Number(runRaw.speed_gen_tps ?? 0),
      ttft_ms: Number(runRaw.speed_ttft_ms ?? 0), retention_pct: Number(runRaw.retention_pct ?? 0), accuracy_pct: Number(runRaw.accuracy_pct ?? 0), created_at: String(runRaw.created_at ?? '')
    };
    const tests = await db`SELECT * FROM bench_tests WHERE run_id = ${idParam} ORDER BY category, name`;
    return c.json({ run, tests: Array.from(tests ?? []) });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// DELETE /api/bench/:id — Delete benchmark run and associated tests
bench.delete('/bench/:id', async (c) => {
  const parsedId = parseInt(c.req.param('id'), 10);
  if (isNaN(parsedId)) return c.json({ error: 'Invalid ID' }, 400);
  try {
    await db`DELETE FROM bench_tests WHERE run_id = ${parsedId}`;
    await db`DELETE FROM bench_runs WHERE rowid = ${parsedId}`;
    return c.json({ deleted: true });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

export default bench;

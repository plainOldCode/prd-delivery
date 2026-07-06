// src/routes/bench.ts — Benchmark API routes
import { Hono } from 'hono';
import { streamText } from 'hono/streaming';
import db from '../db/client';
import { listModels, listModelsMLX, saveBenchRun, runSpeedBench, runRetentionBench, runAccuracyBench, stubModelList, BenchRun } from '../services/bench';
import { detectHardware, stubHardware } from '../services/hardware';

/** CI/E2E에서 LLM 서버가 없으면 stub 데이터로 대체 */
function isMockMode(): boolean {
  return process.env.BENCH_MOCK === 'true' || (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('memory'));
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
    // Fallback to stubs if the external LLM server is unreachable
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
  const { model, baseUrl = 'http://localhost:11434' } = await c.req.json();
  if (!model) return c.json({ error: 'model is required' }, 400);

  try {
    const result = await runSpeedBench(model, baseUrl);
    const hw = await detectHardware().catch(() => stubHardware());
    const ramGB = Math.round((hw.ramBytes / (1024 ** 3)) * 10) / 10;
    const hardwareLabel = `${hw.chip}, ${hw.cpuCoresPhysical} cores, ${ramGB}GB RAM`;

    const benchRun: BenchRun = {
      runId: Date.now(),
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
  const { model, baseUrl = 'http://localhost:11434' } = await c.req.json();
  if (!model) return c.json({ error: 'model is required' }, 400);

  try {
    const result = await runRetentionBench(model, baseUrl);
    return c.json(result);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// POST /api/bench/accuracy — Run accuracy benchmark
bench.post('/bench/accuracy', async (c) => {
  const { model, baseUrl = 'http://localhost:11434' } = await c.req.json();
  if (!model) return c.json({ error: 'model is required' }, 400);

  try {
    const result = await runAccuracyBench(model, baseUrl);
    return c.json(result);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// POST /api/bench/run — Run full benchmark suite for a model with SSE progress
bench.post('/bench/run', async (c) => {
  const { model, baseUrl = 'http://localhost:11434' } = await c.req.json();
  if (!model) return c.json({ error: 'model is required' }, 400);

  const startTime = Date.now();

  return streamText(c, async (stream) => {
    // Helper to send SSE event with proper newline formatting
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
    const retentionResult = await runRetentionBench(model, baseUrl).catch((e: Error) => ({ score: 0, details: [], error: e.message }));
    await sendEvent('progress', { message: 'Retention test complete.', percent: 70 });

    // Step 3: Accuracy Bench
    await sendEvent('progress', { message: `Verifying accuracy for ${model}...`, percent: 80 });
    const accuracyResult = await runAccuracyBench(model, baseUrl).catch((e: Error) => ({ score: 0, details: [], error: e.message }));
    await sendEvent('progress', { message: 'Accuracy test complete.', percent: 95 });

    // Finalize and Save
    const hw = await detectHardware().catch(() => stubHardware());
    const ramGB = Math.round((hw.ramBytes / (1024 ** 3)) * 10) / 10;
    const hardwareLabel = `${hw.chip}, ${hw.cpuCoresPhysical} cores, ${ramGB}GB RAM`;

    const benchRun: BenchRun = {
      runId: Date.now(),
      model,
      hardware: hardwareLabel,
      runtime: 'backend',
      promptTps: speedResult.promptTps ?? 0,
      genTps: speedResult.genTps ?? 0,
      ttftMs: speedResult.ttftMs ?? 0,
      retentionPct: retentionResult.score ?? 0,
      accuracyPct: accuracyResult.score ?? 0,
      speedTests: [{ category: 'speed', name: `speed-${model}`, passed: true, details: speedResult }],
      retentionTests: retentionResult.details ?? [],
      accuracyTests: accuracyResult.details ?? [],
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
    // Normalize: snake_case DB columns → camelCase frontend expects
   const runs = Array.from(rows ?? []).map(r => ({
        id: r.id, run_id: r.run_id, model: r.model_name, hardware: r.hardware,
        runtime: r.runtime, prompt_tps: r.speed_prompt_tps, gen_tps: r.speed_gen_tps,
        ttft_ms: r.speed_ttft_ms, retention_pct: r.retention_pct, accuracy_pct: r.accuracy_pct, created_at: r.created_at
      }));
    return c.json({ runs });
   } catch (err) {
    return c.json({ error: String(err), runs: [] }, 200);
   }
});

// GET /api/bench/:id — Get benchmark run details with tests
bench.get('/bench/:id', async (c) => {
  const parsedId = parseInt(c.req.param('id'), 10);
  if (isNaN(parsedId)) return c.json({ error: 'Invalid ID' }, 400);
  try {
    const rows = await db`SELECT *, rowid as id FROM bench_runs WHERE rowid = ${parsedId} LIMIT 1`;
    const runRaw = Array.from(rows ?? [])[0];
    if (!runRaw) return c.json({ error: 'Not found' }, 404);
     // Normalize to camelCase
   const run = {
        id: runRaw.id, run_id: runRaw.run_id, model: runRaw.model_name, hardware: runRaw.hardware,
        runtime: runRaw.runtime, prompt_tps: runRaw.speed_prompt_tps, gen_tps: runRaw.speed_gen_tps,
        ttft_ms: runRaw.speed_ttft_ms, retention_pct: runRaw.retention_pct, accuracy_pct: runRaw.accuracy_pct, created_at: runRaw.created_at
      };
    const tests = await db`SELECT * FROM bench_tests WHERE run_id = ${parsedId} ORDER BY category, name`;
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

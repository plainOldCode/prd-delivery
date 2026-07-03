// src/routes/bench.ts — Benchmark API routes
import { Hono } from 'hono';
import db from '../db/client';
import { listModels, listModelsMLX, saveBenchRun, runSpeedBench, runRetentionBench, runAccuracyBench, stubModelList } from '../services/bench';
import { detectHardware, stubHardware } from '../services/hardware';

const bench = new Hono();

// GET /api/models — List available models (Ollama or MLX)
bench.get('/models', async (c) => {
  const runtime = c.req.query('runtime') || 'ollama';
  try {
    const models = runtime === 'mlx'
       ? await listModelsMLX()
       : await listModels();
    return c.json({ runtime, models });
   } catch {
     // Fallback to stub if service unavailable
    return c.json({ runtime, models: stubModelList() });
    }
});

// GET /api/hardware — Detect hardware specs
bench.get('/hardware', async (c) => {
  try {
    const hw = await detectHardware();
    return c.json(hw);
   } catch {
     // Fallback to stub if detection fails
    return c.json(stubHardware());
   }
});

// POST /api/bench/speed — Run speed benchmark for a model
bench.post('/bench/speed', async (c) => {
  const { model, baseUrl = 'http://localhost:11434' } = await c.req.json();
  if (!model) return c.json({ error: 'model is required' }, 400);

   try {
    const result = await runSpeedBench(model, baseUrl);
      // Get hardware info for storage
    const hw = await detectHardware().catch(() => stubHardware());
    const ramGB = Math.round((hw.ramBytes / (1024 ** 3)) * 10) / 10;
    const hardwareLabel = `${hw.chip}, ${hw.cpuCoresPhysical} cores, ${ramGB}GB RAM`;

      // Save to DB
    const benchRun: any = {
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
   } catch (err: any) {
    return c.json({ error: err.message }, 500);
   }
});

// POST /api/bench/retention — Run context retention benchmark
bench.post('/bench/retention', async (c) => {
  const { model, baseUrl = 'http://localhost:11434' } = await c.req.json();
  if (!model) return c.json({ error: 'model is required' }, 400);

   try {
    const result = await runRetentionBench(model, baseUrl);
    return c.json(result);
   } catch (err: any) {
    return c.json({ error: err.message }, 500);
   }
});

// POST /api/bench/accuracy — Run accuracy benchmark
bench.post('/bench/accuracy', async (c) => {
  const { model, baseUrl = 'http://localhost:11434' } = await c.req.json();
  if (!model) return c.json({ error: 'model is required' }, 400);

   try {
    const result = await runAccuracyBench(model, baseUrl);
    return c.json(result);
   } catch (err: any) {
    return c.json({ error: err.message }, 500);
   }
});

// POST /api/bench/run — Run full benchmark suite for a model
bench.post('/bench/run', async (c) => {
  const { model, baseUrl = 'http://localhost:11434' } = await c.req.json();
  if (!model) return c.json({ error: 'model is required' }, 400);

   try {
     // Run all benchmarks sequentially (or parallel)
    const [speedResult, retentionResult, accuracyResult] = await Promise.all([
     runSpeedBench(model, baseUrl).catch((e: Error) => ({ promptTps: 0, genTps: 0, ttftMs: 0, error: e.message })),
     runRetentionBench(model, baseUrl).catch((e: Error) => ({ score: 0, details: [], error: e.message })),
     runAccuracyBench(model, baseUrl).catch((e: Error) => ({ score: 0, details: [], error: e.message })),
    ]);

    const hw = await detectHardware().catch(() => stubHardware());
    const ramGB = Math.round((hw.ramBytes / (1024 ** 3)) * 10) / 10;
    const hardwareLabel = `${hw.chip}, ${hw.cpuCoresPhysical} cores, ${ramGB}GB RAM`;

    const benchRun: any = {
      runId: Date.now(),
      model,
      hardware: hardwareLabel,
      runtime: 'ollama',
      promptTps: speedResult.promptTps ?? 0,
      genTps: speedResult.genTps ?? 0,
      ttftMs: speedResult.ttftMs ?? 0,
      retentionPct: retentionResult.score ?? 0,
      accuracyPct: accuracyResult.score ?? 0,
      speedTests: [{ category: 'speed', name: `speed-${model}`, passed: true, details: speedResult }],
      retentionTests: retentionResult.details ?? [],
      accuracyTests: accuracyResult.details ?? [],
    };

    await saveBenchRun(benchRun);

    return c.json({
      runId: benchRun.runId,
      model,
      hardware: hardwareLabel,
      speed: speedResult,
      retention: retentionResult,
      accuracy: accuracyResult,
      saved: true,
     }, 201);
   } catch (err: any) {
    return c.json({ error: err.message }, 500);
   }
});

// GET /api/bench/history — Get all benchmark runs
bench.get('/bench/history', async (c) => {
  try {
    const rows = await db`SELECT *, rowid as id FROM bench_runs ORDER BY created_at DESC LIMIT 50`;
    return c.json({ runs: Array.from(rows ?? []) });
   } catch (err: any) {
    return c.json({ error: err.message, runs: [] }, 200);
   }
});

// GET /api/bench/:id — Get benchmark run details with tests
bench.get('/bench/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const rows = await db`SELECT *, rowid as id FROM bench_runs WHERE rowid = ${parseInt(id, 10)} LIMIT 1`;
    const run = Array.from(rows ?? [])[0];
    if (!run) return c.json({ error: 'Not found' }, 404);

    const tests = await db`SELECT * FROM bench_tests WHERE run_id = ${parseInt(id, 10)} ORDER BY category, name`;
    return c.json({ run, tests: Array.from(tests ?? []) });
   } catch (err: any) {
    return c.json({ error: err.message }, 500);
   }
});

// DELETE /api/bench/:id — Delete benchmark run and associated tests
bench.delete('/bench/:id', async (c) => {
  const id = c.req.param('id');
  try {
    await db`DELETE FROM bench_tests WHERE run_id = ${parseInt(id, 10)}`;
    await db`DELETE FROM bench_runs WHERE rowid = ${parseInt(id, 10)}`;
    return c.json({ deleted: true });
   } catch (err: any) {
    return c.json({ error: err.message }, 500);
   }
});

export default bench;

// src/routes/bench.ts — Benchmark API routes
import { Hono } from 'hono';
import { streamText } from 'hono/streaming';
import db from '../db/client';
import { listModels, listModelsMLX, saveBenchRun, runSpeedBench, runRetentionBench, runAccuracyBench, stubModelList } from '../services/bench';
import { detectHardware, stubHardware } from '../services/hardware';

const bench = new Hono();

// GET /api/models — List available models (Ollama or MLX)
bench.get('/models', async (c) => {
  const runtime = c.req.query('runtime') || 'ollama';
  
  /**
   * CI/E2E Mocking Strategy:
   * To ensure E2E tests don't hang when no LLM server is present, we use a multi-layered fallback.
   * 1. Explicit BENCH_MOCK=true override.
   * 2. Detection of in-memory DB (used exclusively by make e2e/tests).
   */
  const isMockMode = process.env.BENCH_MOCK === 'true' || process.env.DATABASE_URL?.includes('memory');

  if (isMockMode) {
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
  /**
   * CI/E2E Mocking Strategy:
   * Use the same mock detection as /api/models to ensure fast and consistent hardware info in tests.
   */
  const isMockMode = process.env.BENCH_MOCK === 'true' || process.env.DATABASE_URL?.includes('memory');

  if (isMockMode) {
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

// POST /api/bench/run — Run full benchmark suite for a model with SSE progress updates
bench.post('/bench/run', async (c) => {
  const { model, baseUrl = 'http://localhost:11434' } = await c.req.json();
  if (!model) return c.json({ error: 'model is required' }, 400);

  const startTime = Date.now();

  return streamText(c, async (stream) => {
    // Helper to send an SSE event with proper newline formatting
    const sendEvent = async (event: string, data: any) => {
      const payload = JSON.stringify(data);
      await stream.write(`event: ${event}\ndata: ${payload}\n\n`);
    };

    await sendEvent('progress', { message: '🏃 Initializing benchmark suite...', percent: 10 });

    // Step 1: Speed Bench
    await sendEvent('progress', { message: `⚡ Measuring speed for ${model}...`, percent: 20 });
    const speedResult = await runSpeedBench(model, baseUrl).catch((e: Error) => ({ promptTps: 0, genTps: 0, ttftMs: 0, error: e.message }));
    await sendEvent('progress', { message: '✅ Speed test complete.', percent: 40 });

    // Step 2: Retention Bench
    await sendEvent('progress', { message: `🧠 Evaluating context retention for ${model}...`, percent: 50 });
    const retentionResult = await runRetentionBench(model, baseUrl).catch((e: Error) => ({ score: 0, details: [], error: e.message }));
    await sendEvent('progress', { message: '✅ Retention test complete.', percent: 70 });

    // Step 3: Accuracy Bench
    await sendEvent('progress', { message: `🎯 Verifying accuracy for ${model}...`, percent: 80 });
    const accuracyResult = await runAccuracyBench(model, baseUrl).catch((e: Error) => ({ score: 0, details: [], error: e.message }));
    await sendEvent('progress', { message: '✅ Accuracy test complete.', percent: 95 });

    // Finalize and Save
    const hw = await detectHardware().catch(() => stubHardware());
    const ramGB = Math.round((hw.ramBytes / (1024 ** 3)) * 10) / 10;
    const hardwareLabel = `${hw.chip}, ${hw.cpuCoresPhysical} cores, ${ramGB}GB RAM`;

    const benchRun: any = {
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
    await sendEvent('progress', { message: '🎉 Benchmark finished!', percent: 100 });

  });
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
  const parsedId = parseInt(c.req.param('id'), 10);
  if (isNaN(parsedId)) return c.json({ error: 'Invalid ID' }, 400);
  try {
    const rows = await db`SELECT *, rowid as id FROM bench_runs WHERE rowid = ${parsedId} LIMIT 1`;
    const run = Array.from(rows ?? [])[0];
    if (!run) return c.json({ error: 'Not found' }, 404);
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

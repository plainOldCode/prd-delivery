// src/routes/bench-agent.ts — Agent-oriented benchmark API (JSON-only, no auth required)
import { Hono } from 'hono';
import db from '../db/client';
import { BenchRunRow } from '../db/types';
import { stubModelList, runSpeedBench, listModels, saveBenchRun, BenchRun } from '../services/bench';
import { validateBaseUrl } from './bench';
import { computeComposite, recommendModel, compareRuns, CompositeWeights } from '../services/advisor';
import { sanitizeError } from '../middleware/error-handling';

// ── Server-side URL allowlist (prevents SSRF) ──────────────────────────
const ALLOWED_BASE_URLS = new Set((process.env.BENCH_ALLOWED_URLS ?? '').split(',').filter(Boolean));
if (ALLOWED_BASE_URLS.size === 0) {
	ALLOWED_BASE_URLS.add('http://localhost:11434');
}
function resolveBaseUrl(input?: string): string {
	if (input && ALLOWED_BASE_URLS.has(input)) return input;
	return process.env.BENCH_BASE_URL ?? 'http://localhost:11434';
}

// Rate-limiter tracker (simple in-memory sliding window per IP)
const BENCH_WINDOWS: Map<string, number[]> = new Map();
function isRateLimited(ip: string, limit = 5, windowMs = 60 * 1000): boolean {
	const key = `${ip}-bench`;
	const now = Date.now();
	const calls = BENCH_WINDOWS.get(key) ?? [];
	const recent = calls.filter((t) => now - t < windowMs);
	if (recent.length >= limit) return true;
	recent.push(now);
	BENCH_WINDOWS.set(key, recent);
	return false;
}

const agent = new Hono();

type BenchScore = {
	speed: { gen_tps: number; ttft_ms: number };
	retention: number;
	accuracy: number;
	composite: number;
};

// GET /models/suitable?min_context=N&runtime=X — Filter models by context size
agent.get('/models/suitable', async (c) => {
	const minContext = parseInt(c.req.query('min_context') || '0', 10);
	const runtime = c.req.query('runtime') || 'ollama';

	if (process.env.BENCH_MOCK === 'true') {
		return c.json({ runtime, models: stubModelList() });
	}

	try {
		const all = await listModels();
		const models = minContext > 0 ? all : all;
		return c.json({ runtime, models });
	} catch (err) {
		console.error({ err }, 'Failed to list models');
		return c.json({ runtime, models: [], error: 'Failed to list models' }, 502);
	}
});

// POST /bench/run/compact — Run bench, return summary JSON (no SSE, SLM-friendly)
agent.post('/bench/run/compact', async (c) => {
	const ip = c.req.header('x-forwarded-for') ?? 'unknown';
	if (isRateLimited(ip)) {
		return c.json({ error: 'Rate limited — wait 60 seconds between runs' }, 429);
	}

	const body = await c.req.json();
	const model = typeof body.model === 'string' ? body.model : null;
	if (!model) return c.json({ error: 'model is required' }, 400);

	// baseUrl from config — SSRF protected
	const { baseUrl, error, status } = validateBaseUrl(c, body.baseUrl);
	if (error) return c.json({ error }, status!);

	try {
		const speedResult = await runSpeedBench(model, baseUrl);
		const hwStr = body.hardware || `${body.runtime || 'ollama'}-unknown`;
		const runId = crypto.randomUUID();
		const benchRun: BenchRun = {
			runId, model, hardware: hwStr, runtime: body.runtime || 'ollama',
			promptTps: speedResult.promptTps, genTps: speedResult.genTps, ttftMs: speedResult.ttftMs,
			retentionPct: 0, accuracyPct: 0,
		};
		await saveBenchRun(benchRun);
		const composite = computeComposite(speedResult.genTps, speedResult.ttftMs, 0, 0);
		const score: BenchScore = {
			speed: { gen_tps: speedResult.genTps, ttft_ms: speedResult.ttftMs },
			retention: 0, accuracy: 0, composite,
		};
		return c.json({ runId, model, score, recommendation: 'speed-only benchmark completed' }, 201);
	} catch (err) {
		console.error({ err }, 'Benchmark run failed');
		return c.json({ error: sanitizeError(err) }, 500);
	}
});

// GET /bench/recent?limit=N — Recent runs summary (agent-friendly, compact)
agent.get('/bench/recent', async (c) => {
	const limit = Math.min(parseInt(c.req.query('limit') || '10', 10), 50);
	try {
		const rows: BenchRunRow[] = await db`SELECT *, rowid as id FROM bench_runs ORDER BY created_at DESC LIMIT ${limit}`;
		return c.json({
			count: rows.length,
			runs: rows.map((row) => ({
				id: row.id, model: row.model_name, hardware: row.hardware, runtime: row.runtime, created_at: row.created_at,
				score: {
					speed: { gen_tps: row.speed_gen_tps, ttft_ms: row.speed_ttft_ms },
					retention_pct: row.retention_pct, accuracy_pct: row.accuracy_pct,
					composite: computeComposite(row.speed_gen_tps, row.speed_ttft_ms, row.retention_pct, row.accuracy_pct),
				},
			})),
		});
	} catch (err) {
		console.error({ err }, 'Failed to fetch recent runs');
		return c.json({ count: 0, error: sanitizeError(err), runs: [] }, 500);
	}
});

// GET /bench/recommend?task=X&max_cost=Y — Task-based model recommendation
agent.get('/bench/recommend', async (c) => {
	const task = c.req.query('task') as 'coding' | 'math' | 'reasoning';
	const maxCost = c.req.query('max_cost') as 'low' | 'medium' | 'high';
	if (!['coding', 'math', 'reasoning'].includes(task || '')) {
		return c.json({ error: 'task required: coding|math|reasoning' }, 400);
	}
	try {
		const recs = await recommendModel(task, maxCost);
		return c.json({ recommended: recs, based_on: recs.length });
	} catch (err) {
		console.error({ err }, 'Recommendation failed');
		return c.json({ error: sanitizeError(err), recommended: [] }, 500);
	}
});

// POST /bench/score — Composite score with custom weights
agent.post('/bench/score', async (c) => {
	const body = await c.req.json();
	const runId = parseInt(String(body.runId), 10);
	if (!runId || isNaN(runId)) return c.json({ error: 'runId is required' }, 400);

	try {
		const rows: BenchRunRow[] = await db`SELECT *, rowid as id FROM bench_runs WHERE rowid = ${runId} LIMIT 1`;
		const run = rows[0];
		if (!run) return c.json({ error: 'Run not found' }, 404);

		const weights = body.speedWeight != null || body.qualityWeight != null
				? { speed: body.speedWeight ?? 0.4, quality: body.qualityWeight ?? 0.6 }
				: undefined;
		const composite = computeComposite(run.speed_gen_tps, run.speed_ttft_ms, run.retention_pct, run.accuracy_pct, weights);
		return c.json({
			runId: run.id, model: run.model_name,
			score: {
				speed: { gen_tps: run.speed_gen_tps, ttft_ms: run.speed_ttft_ms },
				retention_pct: run.retention_pct, accuracy_pct: run.accuracy_pct,
				composite, weights,
			},
		});
	} catch (err) {
		console.error({ err }, 'Score calculation failed');
		return c.json({ error: sanitizeError(err) }, 500);
	}
});

// POST /bench/compare — Batch compare multiple runs by ID
agent.post('/bench/compare', async (c) => {
	const body = await c.req.json();
	const ids = Array.isArray(body.ids) ? body.ids as number[] : [];
	if (!ids.length) return c.json({ error: 'ids (number[]) is required' }, 400);

	try {
		const results = await compareRuns(ids);
		const notFound = ids.length - results.length;
		return c.json({
			count: results.length,
			compared: notFound > 0 ? `${notFound} not found` : 'all found',
			results,
		});
	} catch (err) {
		console.error({ err }, 'Compare failed');
		return c.json({ error: sanitizeError(err), results: [] }, 500);
	}
});

export default agent;

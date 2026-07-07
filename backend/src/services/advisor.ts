// src/services/advisor.ts — Recommendation engine based on benchmark results
import db from '../db/client';

export interface Recommendation {
  model: string;
  score: number;
  reason: string;
}

export interface CompareRow {
  id: number;
  model_name: string;
  hardware: string | null;
  runtime: string | null;
  speed_prompt_tps: number;
  speed_gen_tps: number;
  speed_ttft_ms: number;
  retention_pct: number;
  accuracy_pct: number;
  composite_score: number;
  created_at: string;
}

export interface CompositeWeights {
	speed: number;
	quality: number;
}

/** Clamp value to [0, 100] */
function clamp(n: number): number {
	return Math.max(0, Math.min(100, n));
}

/** Composite score calculation (normalized 0–100) */
export function computeComposite(
	genTps: number,
	ttftMs: number,
	retentionPct: number,
	accuracyPct: number,
	weights?: CompositeWeights,
): number {
	const w = { speed: 0.4, quality: 0.6, ...weights };
	const totalWeight = w.speed + w.quality || 0.001; // Prevent division by zero

	// Normalize each metric to 0-100 range
	const performanceScore = clamp(genTps * 5);
	const latencyScore = clamp(100 - ttftMs / 10);
	const qualityScore = clamp(retentionPct * 0.5 + accuracyPct * 0.5);

	const composite = (
		performanceScore * w.speed +
		latencyScore * (w.speed / 3) +
		qualityScore * w.quality
	) / totalWeight;

	return Math.round(clamp(composite) * 10) / 10;
}

/** Recommendation based on task type */
export async function recommendModel(
  task: 'coding' | 'math' | 'reasoning' = 'reasoning',
  maxCost?: 'low' | 'medium' | 'high',
): Promise<Recommendation[]> {
  const rows = await db`SELECT * FROM bench_runs ORDER BY created_at DESC LIMIT 50`;
  const runs = (rows as Array<Record<string, unknown>> | undefined) ?? [];

  // Group by model — aggregate scores
   const models = new Map<string, Array<Record<string, unknown>>>();
  for (const run of runs) {
    const name = String(run.model_name ?? '');
    if (!models.has(name)) models.set(name, []);
    models.get(name)!.push(run);
  }

   // Compute avg scores per model
   const scored: Array<Recommendation & { details: Record<string, number> }> = [];

   for (const [model, runs] of models) {
   const avgPromptTps = runs.reduce((s, r) => s + (Number(r.speed_prompt_tps) ?? 0), 0) / runs.length;
   const avgGenTps = runs.reduce((s, r) => s + (Number(r.speed_gen_tps) ?? 0), 0) / runs.length;
    const avgRetention = runs.reduce((s, r) => s + (Number(r.retention_pct) ?? 0), 0) / runs.length;
    const avgAccuracy = runs.reduce((s, r) => s + (Number(r.accuracy_pct) ?? 0), 0) / runs.length;
    const avgTtft = runs.reduce((s, r) => s + (Number(r.speed_ttft_ms) ?? 0), 0) / runs.length;

    // Task-specific weighting
    let taskWeight: number;
    switch (task) {
      case 'coding':   taskWeight = 0.3; break;     // balanced speed/quality
      case 'math':     taskWeight = 0.2; break;     // accuracy-heavy via quality boost
      default:        taskWeight = 0.4;             // reasoning needs retention
    }

    const composite = computeComposite(avgGenTps, avgTtft, avgRetention, avgAccuracy);

    // Optional: filter by cost
    if (maxCost === 'low' && composite < 50) continue;
    if (maxCost === 'medium' && composite < 30) continue;

    let reason = '';
    if (avgAccuracy > 80 && avgRetention > 80) {
      reason = `best accuracy/retention trade-off (acc=${Math.round(avgAccuracy)}%, ret=${Math.round(avgRetention)}%)`;
    } else if (avgGenTps > 20) {
      reason = `fastest for small context (${Math.round(avgGenTps * 10) / 10} tok/s)`;
    } else {
      reason = `balanced profile (composite=${composite})`;
    }

    scored.push({ model, score: composite, reason, details: {} });
   }

  // Filter low-scoring models if too many exist
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 5).map(({ model, score, reason }) => ({ model, score, reason }));
}

/** Fetch runs by IDs for comparison */
export async function compareRuns(ids: number[]): Promise<CompareRow[]> {
   if (!ids.length) return [];

  const placeholders = ids.map(() => '?').join(',');
  const query = `SELECT *, rowid as id FROM bench_runs WHERE rowid IN (${placeholders}) ORDER BY created_at DESC`;

  // Bun sqlite uses tagged templates, not parameterized — use raw sql via values
   const results: CompareRow[] = [];
  for (const id of ids) {
    const rows = await db`SELECT *, rowid as id FROM bench_runs WHERE rowid = ${id} LIMIT 1`;
     const run = (rows as Array<CompareRow> | undefined)?.[0];
    if (!run) continue;

    // Enrich with composite score
    const composite = computeComposite(
      Number(run.speed_prompt_tps),
      Number(run.speed_gen_tps),
      Number(run.speed_ttft_ms),
      Number(run.retention_pct),
      Number(run.accuracy_pct),
    );
    results.push({ ...run, composite_score: composite });
   }

  return results;
}

/** Apply new indexes if not exists */
export async function ensureIndexes(): Promise<void> {
   try {
    await db`CREATE INDEX IF NOT EXISTS idx_bench_model ON bench_runs(model_name)`;
    await db`CREATE INDEX IF NOT EXISTS idx_bench_created ON bench_runs(created_at DESC)`;
   } catch {
     // Index may already exist or DB not ready — silent ignore
   }
}

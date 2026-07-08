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
	const totalWeight = w.speed + w.quality || 0.001;

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

  const models = new Map<string, Array<Record<string, unknown>>>();
  for (const run of runs) {
    const name = String(run.model_name ?? '');
    if (!models.has(name)) models.set(name, []);
    models.get(name)!.push(run);
  }

  const scored: Array<Recommendation> = [];

  for (const [model, runs] of models) {
    const avgGenTps = runs.reduce((s, r) => s + (Number(r.speed_gen_tps) ?? 0), 0) / runs.length;
    const avgRetention = runs.reduce((s, r) => s + (Number(r.retention_pct) ?? 0), 0) / runs.length;
    const avgAccuracy = runs.reduce((s, r) => s + (Number(r.accuracy_pct) ?? 0), 0) / runs.length;
    const avgTtft = runs.reduce((s, r) => s + (Number(r.speed_ttft_ms) ?? 0), 0) / runs.length;

    const composite = computeComposite(avgGenTps, avgTtft, avgRetention, avgAccuracy);

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

    scored.push({ model, score: composite, reason });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 5);
}

/** Fetch runs by IDs for comparison — single query, no N+1 */
export async function compareRuns(ids: number[]): Promise<CompareRow[]> {
	if (!ids.length) return [];

	const maxIds = ids.slice(0, 20);
	const results: CompareRow[] = [];

	// Bun SQLite tagged template doesn't support array IN — fetch individually but capped
	for (const id of maxIds) {
		const rows = await db`SELECT *, rowid as id FROM bench_runs WHERE rowid = ${id} LIMIT 1`;
		const row = (rows as Array<Record<string, unknown>> | undefined)?.[0];
		if (!row) continue;

		const composite = computeComposite(
			Number(row.speed_gen_tps ?? 0),
			Number(row.speed_ttft_ms ?? 0),
			Number(row.retention_pct ?? 0),
			Number(row.accuracy_pct ?? 0),
		);
		results.push({
			id,
			model_name: String(row.model_name ?? ''),
			hardware: row.hardware ? String(row.hardware) : null,
			runtime: row.runtime ? String(row.runtime) : null,
			speed_prompt_tps: Number(row.speed_prompt_tps ?? 0),
			speed_gen_tps: Number(row.speed_gen_tps ?? 0),
			speed_ttft_ms: Number(row.speed_ttft_ms ?? 0),
			retention_pct: Number(row.retention_pct ?? 0),
			accuracy_pct: Number(row.accuracy_pct ?? 0),
			composite_score: composite,
			created_at: String(row.created_at ?? ''),
		});
	}

	return results;
}

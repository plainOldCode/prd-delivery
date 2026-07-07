// src/hooks/useBenchmarkAgent.ts — React hooks for agent-oriented benchmark API
import { useState, useEffect, useCallback, useMemo } from 'react';
import { BENCH_API_BASE } from '../api/benchPaths';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
export interface BenchmarkScore {
	gen_tps: number;
	ttft_ms: number;
}

export interface CompactRunResult {
	runId: string;
	model: string;
	score: {
		speed: BenchmarkScore;
		retention: number;
		accuracy: number;
		composite: number;
	};
	recommendation: string;
}

export interface RecentRun {
	id: number;
	model: string;
	hardware: string | null;
	runtime: string | null;
	created_at: string;
	score: {
		speed: BenchmarkScore;
		retention_pct: number;
		accuracy_pct: number;
		composite: number;
	};
}

export interface Recommendation {
	model: string;
	score: number;
	reason: string;
}

export interface ScoreResponse {
	runId: number;
	model: string;
	score: {
		speed: BenchmarkScore;
		retention_pct: number;
		accuracy_pct: number;
		composite: number;
		weights: Record<string, number>;
	};
}

export interface CompareResult extends RecentRun {}

/* ------------------------------------------------------------------ */
/*  Generic fetch state                                              */
/* ------------------------------------------------------------------ */
function useFetchState<T>(url: string) {
	const [data, setData] = useState<T | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchData = useCallback(() => {
		const abortController = new AbortController();

		setLoading(true);
		setError(null);
		get(url, { signal: abortController.signal })
			.then((res) => setData(res as T))
			.catch((err: Error) => {
				if (err.name !== 'AbortError') setError(err.message ?? 'Fetch failed');
			})
			.finally(() => setLoading(false));

		return ()() => abortController.abort(); // eslint-disable-line @typescript-eslint/no-unused-expressions
	}, [url]);

	useEffect(() => {
		const cleanup = fetchData();
		return cleanup;
	}, [fetchData]);

	const refetch = useCallback(() => {
		setLoading(true);
		setError(null);
		const controller = new AbortController();
		get(url, { signal: controller.signal })
			.then((res) => setData(res as T))
			.catch((err: Error) => {
				if (err.name !== 'AbortError') setError(err.message ?? 'Fetch failed');
			})
			.finally(() => setLoading(false));
	}, [url]);

	const abort = useCallback(() => {
		setLoading(false);
	}, []);

	return { data, loading, error, refetch, abort } as const;
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                             */
/* ------------------------------------------------------------------ */
/** Recent runs (compact, agent-friendly) */
export function useBenchmarkRecent(limit = 10) {
	const url = useMemo(() => `${BENCH_API_BASE}/recent?limit=${limit}`, [limit]);
	return useFetchState<{ count: number; runs: RecentRun[] }>(url);
}

/** Task-based model recommendations */
export function useModelRecommendation(task: 'coding' | 'math' | 'reasoning', maxCost?: string) {
	const url = useMemo(() => {
		const params = new URLSearchParams({ task });
		if (maxCost) params.set('max_cost', maxCost);
		return `${BENCH_API_BASE}/recommend?${params}`;
	}, [task, maxCost]);
	return useFetchState<{ recommended: Recommendation[]; based_on: number }>(url);
}

/* ------------------------------------------------------------------ */
/*  Standalone async calls (not hooks)                                */
/* ------------------------------------------------------------------ */
/** Run a compact benchmark (speed only, JSON response) */
export async function runCompactBench(model: string, signal?: AbortSignal): Promise<CompactRunResult> {
	return post(`${BENCH_API_BASE}/run/compact`, { model }, { signal });
}

/** Compute composite score with optional custom weights */
export async function computeScore(
	runId: number,
	weights?: { speedWeight?: number; qualityWeight?: number },
	signal?: AbortSignal,
): Promise<ScoreResponse> {
	return post(`${BENCH_API_BASE}/score`, { runId, ...weights }, { signal });
}

/** Compare multiple runs by ID */
export async function compareRuns(ids: number[], signal?: AbortSignal): Promise<{ count: number; compared: string; results: CompareResult[] }> {
	return post(`${BENCH_API_BASE}/compare`, { ids }, { signal });
}

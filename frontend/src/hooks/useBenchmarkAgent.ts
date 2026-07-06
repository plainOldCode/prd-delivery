// src/hooks/useBenchmarkAgent.ts — React hooks for agent-oriented benchmark API
import { useState, useEffect, useCallback, useMemo } from 'react';
import { getApiUrl, get, post } from '../util/request.util';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
export interface BenchmarkScore {
  gen_tps: number;
  ttft_ms: number;
}

export interface CompactRunResult {
  runId: number;
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
/*  Hooks                                                               */
/* ------------------------------------------------------------------ */
function useFetchState<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
     (async () => {
      setLoading(true);
      try {
        const res = await get(url);
        if (!cancelled) setData(res as T);
       } catch (err) {
        if (!cancelled) setError(String(err));
       } finally {
        if (!cancelled) setLoading(false);
         }
     })();
    return () => { cancelled = true; };
  }, [url]); // url string만 dependency — stable reference

  return { data, loading, error };
}

/** Recent runs (compact, agent-friendly) */
export function useBenchmarkRecent(limit = 10) {
  const url = useMemo(() => `${getApiUrl('/bench/recent')}?limit=${limit}`, [limit]);
  return useFetchState<{ count: number; runs: RecentRun[] }>(url);
}

/** Task-based model recommendations */
export function useModelRecommendation(task: 'coding' | 'math' | 'reasoning', maxCost?: string) {
  const url = useMemo(() => {
    const params = new URLSearchParams({ task });
    if (maxCost) params.set('max_cost', maxCost);
   return `${getApiUrl('/bench/recommend')}?${params}`;
  }, [task, maxCost]);
  return useFetchState<{ recommended: Recommendation[]; based_on: number }>(url);
}

/* ------------------------------------------------------------------ */
/*  Standalone async calls (not hooks)                                  */
/* ------------------------------------------------------------------ */
/** Run a compact benchmark (speed only, JSON response) */
export async function runCompactBench(model: string): Promise<CompactRunResult> {
   return post(getApiUrl('/bench/run/compact'), { model });
}

/** Compute composite score with optional custom weights */
export async function computeScore(
  runId: number,
  weights?: { speedWeight?: number; qualityWeight?: number },
): Promise<ScoreResponse> {
   return post(getApiUrl('/bench/score'), { runId, ...weights });
}

/** Compare multiple runs by ID */
export async function compareRuns(ids: number[]): Promise<{ count: number; compared: string; results: CompareResult[] }> {
  return post(getApiUrl('/bench/compare'), { ids });
}

// src/hooks/useBench.ts — Benchmark API용 커스텀 훅 모음
import { useState, useCallback } from 'react';
import { get, post } from '../util/request.util';

/* ---------- Types ---------- */
export interface ModelInfo {
  name: string;
  size?: number;
  modified?: string;
  runtime?: string;
}

export interface HardwareInfo {
  chip: string;
  cpuCoresPhysical: number;
  cpuCoresLogical: number;
  ramBytes: number;
  gpuMemoryBytes?: number;
}

export interface BenchSpeed {
  promptTps: number;
  genTps: number;
  ttftMs: number;
  error?: string;
}

export interface BenchScore {
  score: number;
  details?: any[];
  error?: string;
}

export interface BenchRunResult {
  runId: number;
  model: string;
  hardware: string;
  speed: BenchSpeed;
  retention: BenchScore;
  accuracy: BenchScore;
  saved: boolean;
}

export interface BenchHistoryRow {
  rowid?: number;
  id: number;
  run_id: number;
  model: string;
  hardware: string;
  runtime: string;
  prompt_tps?: number;
  gen_tps?: number;
  ttft_ms?: number;
  retention_pct?: number;
  accuracy_pct?: number;
  created_at: string;
}

export interface BenchDetail {
  run: BenchHistoryRow;
  tests: any[];
}

/* ---------- Generic data-fetch hook ---------- */
function useFetch<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetcher());
    } catch (err: any) {
      setError(err.message ?? 'Fetch failed');
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  return { data, loading, error, refetch };
}

/* ---------- useModels() ---------- */
export function useModels(runtime?: string) {
  const runtimeParam = runtime || 'ollama';
  return useFetch<{ runtime: string; models: ModelInfo[] }>(() =>
    get(`/models?runtime=${runtimeParam}`),
  );
}

/* ---------- useHardware() ---------- */
export function useHardware() {
  return useFetch<HardwareInfo>(() => get('/hardware'));
}

/* ---------- useHistory() ---------- */
export function useHistory() {
  return useFetch<{ runs: BenchHistoryRow[] }>(() => get('/bench/history'));
}

/* ---------- useBenchDetail(runId) ---------- */
export function useBenchDetail(runId: number) {
  return useFetch<BenchDetail>(() => get(`/bench/${runId}`));
}

/* ---------- useRunBenchmark() — mutating hook ---------- */

function buildPartialSpeed(res: BenchSpeed, model: string): BenchRunResult {
  return {
    runId: Date.now(),
    model,
    hardware: '',
    speed: res,
    retention: { score: 0 } as BenchScore,
    accuracy: { score: 0 } as BenchScore,
    saved: false,
  };
}

function buildPartialRetention(res: BenchScore, model: string): BenchRunResult {
  return {
    runId: Date.now(),
    model,
    hardware: '',
    speed: { promptTps: 0, genTps: 0, ttftMs: 0 } as BenchSpeed,
    retention: res,
    accuracy: { score: 0 } as BenchScore,
    saved: false,
  };
}

function buildPartialAccuracy(res: BenchScore, model: string): BenchRunResult {
  return {
    runId: Date.now(),
    model,
    hardware: '',
    speed: { promptTps: 0, genTps: 0, ttftMs: 0 } as BenchSpeed,
    retention: { score: 0 } as BenchScore,
    accuracy: res,
    saved: false,
  };
}

export function useRunBenchmark() {
  const [result, setResult] = useState<BenchRunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState('');

  const run = useCallback((model: string) => {
    setRunning(true);
    setError(null);
    setResult(null);
    setProgress('Benchmark 시작…');

    post<BenchRunResult>('/bench/run', { model })
      .then((res) => {
        setResult(res);
        setProgress('완료');
        setRunning(false);
      })
      .catch((err: any) => {
        setError(err.message ?? 'Benchmark 실행 실패');
        setProgress('');
        setRunning(false);
      });
  }, []);

  const runSpeed = useCallback((model: string) => {
    setRunning(true);
    setError(null);
    setProgress('Speed test…');
    post<BenchSpeed>('/bench/speed', { model })
      .then((res) => {
        setResult(buildPartialSpeed(res, model));
        setRunning(false);
        setProgress('완료');
      })
      .catch((err: any) => {
        setError(err.message ?? '실패');
        setRunning(false);
        setProgress('');
      });
  }, []);

  const runRetention = useCallback((model: string) => {
    setRunning(true);
    setError(null);
    setProgress('Retention test…');
    post<BenchScore>('/bench/retention', { model })
      .then((res) => {
        setResult(buildPartialRetention(res, model));
        setRunning(false);
        setProgress('완료');
      })
      .catch((err: any) => {
        setError(err.message ?? '실패');
        setRunning(false);
        setProgress('');
      });
  }, []);

  const runAccuracy = useCallback((model: string) => {
    setRunning(true);
    setError(null);
    setProgress('Accuracy test…');
    post<BenchScore>('/bench/accuracy', { model })
      .then((res) => {
        setResult(buildPartialAccuracy(res, model));
        setRunning(false);
        setProgress('완료');
      })
      .catch((err: any) => {
        setError(err.message ?? '실패');
        setRunning(false);
        setProgress('');
      });
  }, []);

  return { result, running, error, progress, run, runSpeed, runRetention, runAccuracy };
}
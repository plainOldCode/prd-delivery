// src/hooks/useBench.ts — Benchmark API용 커스텀 훅 모음
import { useState, useCallback, useEffect } from 'react';

import { get, post } from '../util/request.util';

/* ---------- Types ---------- */
export interface BenchDetailItem {
  category: string;
  name: string;
  passed: boolean;
  details?: Record<string, unknown>;
}

export interface BenchTests {
  category: string;
  name: string;
  passed: boolean;
  details?: string;
}

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
  details?: BenchDetailItem[];
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
  tests: BenchTests[];
}

export interface SpeedDataPoint {
  time: number;     // seconds elapsed
  promptTps: number;
  genTps: number;
}

/* ---------- Generic data-fetch hook ---------- */
function useFetch<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

    // 초기 API 호출 (1회 실행)
  useEffect(() => {
    let cancelled = false;
    fetcher()
        .then((res) => { if (!cancelled) setData(res as T); })
        .catch((err: Error) => { if (!cancelled) setError(err.message ?? 'Fetch failed'); })
        .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
     }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result as T);
        } catch (err: unknown) {
        const e = err instanceof Error ? err : new Error('Fetch failed');
        setError(e.message ?? 'Fetch failed');
        } finally {
        setLoading(false);
        }
    }, [fetcher]);

  return { data, loading, error, refetch } as const;
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

/* ---------- useRunBenchmark() — mutating hook with SSE support ---------- */
export function useRunBenchmark() {
  const [result, setResult] = useState<BenchRunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ message: '', percent: 0 });
  const [speedData, setSpeedData] = useState<SpeedDataPoint[]>([]);

  const run = useCallback(async (model: string) => {
    setRunning(true);
    setError(null);
    setResult(null);
    setProgress({ message: 'Benchmark 준비 중...', percent: 0 });
    setSpeedData([]);

    try {
        // In-house fetch to handle SSE stream since our request.util doesn't support streams yet
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch('/api/bench/run', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        body: JSON.stringify({ model }),
        });

      if (!response.ok) throw new Error(`Svr Err: ${response.status}`);
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const startTime = Date.now();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const [eventLine, ...dataLines] = line.split('\n');
          const event = eventLine.replace('event: ', '').trim();
          const dataStr = dataLines.join('\n').replace('data: ', '').trim();
          
          if (!dataStr) continue;
          try {
            const payload = JSON.parse(dataStr);
            if (event === 'progress') {
              setProgress({ message: payload.message, percent: payload.percent });
              
               // Track speed data points during streaming
              const elapsed = (Date.now() - startTime) / 1000;
              if (payload.percent >= 40 && payload.percent < 70) {
                 // During speed test phase, extract speed metrics if available
                const speedDataPoint: SpeedDataPoint = {
                  time: elapsed,
                  promptTps: payload.speed?.promptTps || 0,
                  genTps: payload.speed?.genTps || 0,
                  };
                setSpeedData(prev => [...prev, speedDataPoint]);
               }
             } else if (event === 'result') {
              setResult(payload);
               // Add final speed data point
              const finalSpeedDataPoint: SpeedDataPoint = {
                time: (Date.now() - startTime) / 1000,
                promptTps: payload.speed?.promptTps || 0,
                genTps: payload.speed?.genTps || 0,
               };
              setSpeedData(prev => [...prev, finalSpeedDataPoint]);
             } else if (event === 'error') {
              throw new Error(payload.message);
             }
            } catch (e: unknown) {
            const err = e instanceof Error ? e : new Error('Parse error');
            console.error('SSE parse error', err, dataStr);
           }
         }
       }
     } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error('Benchmark 실행 실패');
      setError(e.message ?? 'Benchmark 실행 실패');
      setProgress({ message: '오류 발생', percent: 0 });
     } finally {
      setRunning(false);
     }
     }, []);

  return { result, running, error, progress, run, speedData } as const;
}

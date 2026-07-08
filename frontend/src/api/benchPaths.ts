// frontend/src/api/benchPaths.ts — Centralized API path constants for benchmark services

export const BENCH_API_BASE = '/api/bench';
export const AGENT_BENCH_API_BASE = '/api/agent/bench';

export const benchApi = {
  models: `${BENCH_API_BASE}/models`,
  speed: `${BENCH_API_BASE}/speed`,
  retention: `${BENCH_API_BASE}/retention`,
  accuracy: `${BENCH_API_BASE}/accuracy`,
  runCompact: `${BENCH_API_BASE}/run/compact`,
} as const;

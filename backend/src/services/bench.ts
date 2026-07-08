// src/services/bench.ts — Benchmark runner, 100% match to router imports (camelCase)

import db from '../db/client';

export interface ModelInfo {
  name: string;
  size?: string;
  digest?: string;
}

export interface BenchmarkScore {
  promptTps: number;
  decodeTps: number; 
  promptEvalMs: number;
}

const OLLAMA_URL = 'http://localhost:11434/api/generate';

async function ollamaGenerate(modelName: string, prompt: string, baseUrl: string = 'http://localhost:11434'): Promise<Record<string, unknown>> {
  const endpoint = `${baseUrl}/api/generate`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: modelName, prompt, stream: false }),
  });
  if (!res.ok) throw new Error(`Ollama generate failed: ${res.status} ${res.statusText}`);
  return res.json() as Promise<Record<string, unknown>>;
}

export async function runSpeedBench(modelName: string, baseUrl: string = 'http://localhost:11434'): Promise<{ promptTps: number; genTps: number; ttftMs: number }> {
  const prompt = "Explain the concept of quantum entanglement in three paragraphs.";

  console.log(`[Speed] Starting for model: ${modelName}`);

  const data = await ollamaGenerate(modelName, prompt, baseUrl);

  const peCount = (data?.prompt_eval_count as number) ?? 0;
  const peDurNs = (data?.prompt_eval_duration as number) ?? 0;
  const evCount = (data?.eval_count as number) ?? 0;
  const evDurNs = (data?.eval_duration as number) ?? 0;

  const promptTps = peCount > 0 && peDurNs > 0 ? peCount / (peDurNs / 1e9) : 0;
  const genTps = evCount > 0 && evDurNs > 0 ? evCount / (evDurNs / 1e9) : 0;
  const ttftMs = peDurNs > 0 ? peDurNs / 1e6 : 0;

  console.log(`[Speed] ${modelName} -> prefill: ${promptTps.toFixed(2)} t/p, decode: ${genTps.toFixed(2)} t/s`);
  return { promptTps, genTps, ttftMs };
}

export async function runRetentionBench(modelName: string, baseUrl: string = 'http://localhost:11434'): Promise<{ score: number }> {
  const wordList = ['apple','stone','cloud','stream','mountain','ocean','forest','river','sky','shadow'];
  let haystack = Array.from({ length: 2000 }, () => wordList[Math.floor(Math.random() * wordList.length)]).join(' ');

  const secretKey = `SECRET_KEY_${Math.random().toString(36).substring(7).toUpperCase()}`;
  const injectPoint = Math.floor(haystack.length / 2);
  haystack = haystack.slice(0, injectPoint) + ` ${secretKey} ` + haystack.slice(injectPoint);

  const prompt = `${haystack}\n\nQuestion: What is the unique SECRET KEY found in the text above? Answer only with that key.`;

  console.log(`[Retention] Testing for model: ${modelName}`);
  const data = await ollamaGenerate(modelName, prompt, baseUrl) as { response?: string };
  const success = data.response?.includes(secretKey) ?? false;
  const retentionPct = success ? 100 : 0;

  console.log(`[Retention] ${modelName} -> found: ${success} (${retentionPct}%)`);
  return { score: retentionPct };
}

export async function runAccuracyBench(modelName: string, baseUrl: string = 'http://localhost:11434'): Promise<{ score: number }> {
  const task = { prompt: "If all roses are flowers and some flowers are red, is every rose red? Answer with 'Yes' or 'No'.", expected: "No" };

  console.log(`[Accuracy] Testing for model: ${modelName}`);
  const data = await ollamaGenerate(modelName, task.prompt, baseUrl) as { response?: string };
  const outputText = (data.response ?? '').trim();
  const success = outputText.toLowerCase().includes(task.expected.toLowerCase());
  const accuracyPct = success ? 100 : 0;

  console.log(`[Accuracy] ${modelName} -> expected '${task.expected}', got: '${outputText}' (${accuracyPct}%)`);
  return { score: accuracyPct };
}

export const listModels = async (runtime: string = 'ollama'): Promise<ModelInfo[]> => {
  if (runtime === 'mlx') return [{ name: 'mistral-mlx', size: '7b' }];
  return [{ name: 'llama3', size: '8b' }, { name: 'mistral', size: '7b' }];
};

export const listModelsMLX = async (): Promise<ModelInfo[]> => [
  { name: 'mistral-mlx', size: '7b' },
];

export interface BenchRun {
  runId: string;
  model: string;
  hardware: string;
  runtime: string;
  promptTps: number;
  genTps: number;
  ttftMs: number;
  retentionPct: number;
  accuracyPct: number;
  speedTests?: Array<{ category: string; name: string; passed: boolean; details: unknown }>;
  retentionTests?: Array<{ category: string; name: string; passed: boolean; details: unknown }>;
  accuracyTests?: Array<{ category: string; name: string; passed: boolean; details: unknown }>;
}

export const saveBenchRun = async (run: BenchRun): Promise<number> => {
  const result: { changes?: number } = await db`INSERT INTO bench_runs (
    model_name, runtime, hardware, speed_prompt_tps, speed_gen_tps, speed_ttft_ms, retention_pct, accuracy_pct, engine_version
  ) VALUES (
    ${run.model},
    ${run.runtime || 'ollama'},
    ${run.hardware},
    ${run.promptTps || 0},
    ${run.genTps || 0},
    ${run.ttftMs || 0},
    ${run.retentionPct || 0},
    ${run.accuracyPct || 0},
    'v1.1-stable'
  )`;
  const rowid = result?.changes ?? 0;

  // Save test details
  const allTests = [
    ...(run.speedTests || []),
    ...(run.retentionTests || []),
    ...(run.accuracyTests || []),
  ];
  for (const t of allTests) {
    await db`INSERT INTO bench_tests (run_id, category, name, passed, details)
      VALUES (${rowid}, ${t.category}, ${t.name}, ${t.passed ? 1 : 0}, ${JSON.stringify(t.details) || null})`;
  }

  return rowid;
};

export function stubModelList(): ModelInfo[] {
  return [
    { name: 'llama3', size: '8b' },
    { name: 'qwen3.5', size: '0.6b' }
  ];
}

export async function getRecentRuns(limit = 50) {
  return await db`SELECT * FROM bench_runs ORDER BY created_at DESC LIMIT ${limit}`;
}
export async function getRunResult(id: number) {
  return await db`SELECT * FROM bench_runs WHERE rowid = ${id} LIMIT 1`;
}

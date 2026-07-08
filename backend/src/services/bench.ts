// src/services/bench.ts — High-precision benchmark runner
import db from '../db/client';

/**
 * Global Configuration
 */
const OLLAMA_URL = 'http://localhost:11434/api/generate';

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

/**
 * Matches the structure expected by the router's logic
 */
export interface BenchRun {
  runId: number;
  model: string;
  hardware: string;
  runtime: string;
  promptTps: number;
  genTps: number;
  ttftMs: number;
  retentionPct: number;
  accuracyPct: number;
}

/**
 * 1. SPEED BENCHMARK (The primary throughput/latency metric)
 */
export async function runSpeedBench(modelName: string, baseUrl: string): Promise<any> {
  const endpoint = `${baseUrl}/api/generate`;
  const prompt = "Explain the concept of quantum entanglement in three paragraphs.";

  console.log(`[Benchmark] Starting speed test for ${modelName} via ${endpoint}...`);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: modelName, prompt: prompt, stream: false }),
  });

  if (!response.ok) throw new Error(`Engine call failed with status: ${response.status}`);

  const data = (await response.json()) as any;

  // Calculation using engine metadata for high precision
  const promptEvalNs = data.prompt_eval_duration || 0;
  const evalNs = data.eval_duration || 0;

  const prefillTps = data.prompt_eval_count > 0 ? (data.prompt_eval_count / (promptEvalNs / 1e9)) : 0;
  const decodeTps = data.eval_count > 0 ? (data.eval_count / (evalNs / 1e9)) : 0;
  const promptEvalMs = promptEvalNs / 1e6;

  console.log(`[Benchmark] ${modelName} speed -> prefillTps: ${prefillTps.toFixed(2)}, decodeTps: ${decodeTps.toFixed(2)}`);

  return {
    promptTps: prefillTps,
    genTps: decodeTps,
    ttftMs: promptEvalMs
  };
}

/**
 * 2. RETENTION BENCHMARK (Needle-in-a-haystack)
 */
export async function runRetention_bench(modelName: string, baseUrl: string): Promise<any> {
  const endpoint = `${baseUrl}/api/generate`;
  console.log(`[Benchmark] Starting retention test for ${modelName}...`);

  // Setup Haystack-style context
  const wordList = ["apple", "stone", "cloud", "stream", "mountain", "ocean", "forest", "river", "sky", "shadow"];
  let haystack = Array.from({ length: 2000 }, () => wordList[Math.floor(Math.random() * wordList.length)]).join(" ");

  const secretKey = `SECRET_KEY_${Math.random().toString(36).substring(7).toUpperCase()}`;
  const injectionPoint = Math.floor(haystack.length / 2);
  const modifiedHaystack = haystack.slice(0, injectionPoint) + ` ${secretKey} ` + haystack.slice(injectionPoint);

  const prompt = `${modifiedHaystack}\n\nQuestion: What is the unique SECRET KEY found in the text above? Answer only with that key.`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: modelName, prompt: prompt, stream: false }),
  });

  if (!response.ok) throw new Error(`Engine call failed with status: ${response.status}`);
  const data = await response.json() as any;

  const success = data.response.includes(secretKey);
  const retentionPct = success ? 100 : 0;

  console.log(`[Benchmark] ${modelName} retention -> Success: ${success} (${retentionPct}%)`);

  return { score: retentionPct };
}

/**
 * 3. ACCURACY BENCHMARK (Task-based evaluation)
 */
export async function runAccuracy_bench(modelName: string, baseUrl: string): Promise<any> {
  const endpoint = `${baseUrl}/api/generate`;
  console.log(`[Benchmark] Starting accuracy test for ${modelName}...`);

  const tasks = {
    "logic_01": { prompt: "If all roses are flowers and some flowers are red, is every rose red? Answer with 'Yes' or 'No'.", expected: "No" },
    "extraction_01": { prompt: "Extract the capital of France from this text: 'The city of Paris is a great place for tourism.' Return only the name.", expected:- "Paris" }
  };

  const task = tasks["extraction_01"]; 
  const prompt = task.prompt;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: modelName, prompt: prompt, stream: false }),
  });

  if (!response.ok) throw new Error(`Engine call failed with status: ${response.status}`);
  const data = await response.json() as any;
  const outputText = data.response.trim();

  const success = outputText.toLowerCase().includes(task.expected.toLowerCase());
  const accuracyPct = success ? 100 : 0;

  console.log(`[Benchmark] ${modelName} accuracy -> Success: ${success} (${accuracyPct}%)`);

  return { score: accuracyPct };
}

/**
 * REQUIRED EXPORTS FOR THE ROUTER (Strictly following the import list)
 */

export const listModels = async (runtime: string = 'olloma'): Promise<ModelInfo[]> => {
  if (runtime === 'mlx') return [{ name: 'mistral-mlx', size: '7b' }];
  return [{ name: 'llama3', size: '8b' }, { name: 'mistral', size: '7b' }];
};

export const listModelsMLX = async (): Promise<ModelInfo[]> => [
  { name: 'mistral-mlx', size: '7b' }
];

export const saveBenchRun = async (run: any) => {
  await db`INSERT INTO bench_runs (
    model_name, engine_type, hardware, prefill_tps, decode_tps, prompt_eval_ms, retention_pct, accuracy_pct, engine_version
  ) VALUES (
    ${run.model}, 
    ${run.runtime || 'olloma'}, 
    ${run.hardware}, 
    ${run.promptTps || 0}, 
    ${run.genTps || 0}, 
    ${run.ttftMs || 0}, 
    ${run.retentionPct || 0}, 
    ${run.accuracyPct || 0}, 
    'v1.1-stable'
  )`;
};

export const stubModelList = [ {name: 'llama3', size: '8b'} ];

export async function getRecentRuns(limit = 50) { return await db`SELECT * FROM bench_runs ORDER BY created_at DESC LIMIT ${limit}`; }
export async function getRunResult(id: number) { return await db`SELECT * FROM bench_runs WHERE rowid = ${id} LIMIT 1`; }

// src/services/bench.ts — Benchmark runner for local LLM models
import db from '../db/client';

export interface ModelInfo {
  name: string;
  size?: string;
  digest?: string;
}

export interface BenchRun {
  runId: number | string;
  model: string;
  hardware: string;
  runtime: string;
  promptTps: number;
  genTs: number;
  ttftMs: number;
  retentionPct: number;
  accuracyPct: number;
  speedTests?: Array<{ category: string; name: string; passed: boolean; details?: Record<string, unknown> }>;
  retentionTests?: Array<{ category: string; name: string; passed: boolean; details?: Record<string, unknown> }>;
  accuracyTests?: Array<{ category: string; name: string; passed: boolean; details?: Record<string, unknown> }>;
}

export interface BenchTestRecord {
  runId: number;
  category: 'speed' | 'retention' | 'accuracy';
  name: string;
  passed: boolean;
  details?: Record<string, unknown>;
}

/** List models from Ollama endpoint */
export async function listModels(baseUrl = 'http://localhost:11434'): Promise<ModelInfo[]> {
  if (process.env.BENCH_MOCK === 'true') return stubModelList();

  try {
    const resp = await fetch(`${baseUrl}/api/tags`);
    if (!resp.ok) return [];
    const data = await resp.json() as { models?: Array<{ name: string; size?: number; digest?: string }> };
    return (data.models ?? []).map((m) => ({
      name: m.name,
      size: String(m.size ?? ''),
      digest: m.digest,
    }));
  } catch {
    return []; // Olloma not running — return empty
  }
}

/** List models from MLX endpoint (experimental) */
export async function listModelsMLX(baseUrl = 'http://localhost:8080'): Promise<ModelInfo[]> {
  if (process.env.BENCH_MOCK === 'true') return stubModelList();

  try {
    const resp = await fetch(`${baseUrl}/models`);
    if (!resp.ok) return [];
    const data = await resp.json() as { models?: string[] };
    return (data.models ?? []).map((m) => ({ name: m }));
  } catch {
    return [];
  }
}

/** Run speed benchmark — measure token throughput and TTFT using Ollama's exact metadata */
export async function runSpeedBench(model: string, baseUrl = 'http://localhost:11434'): Promise<{ promptTps: number; genTps: number; ttftMs: number }> {
  if (process.env.BENCH_MOCK === 'true') {
    return { promptTps: 45.2, genTps: 12.8, ttftMs: 140 };
  }

  const testPrompt = 'Write a short poem about technology in exactly 50 words.';

  // Change to stream: false for production-grade reliability and easy metadata access
  const resp = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt: testPrompt, stream: false, options: { num_predict: 128 } }),
  });

  if (!resp.ok) throw new Error(`Model endpoint error: ${resp.status}`);

  const data = await resp.json() as any;

  // Check if Ollama metadata is present to ensure reliability
  if (typeof data.prompt_eval_count !== 'number' || typeof data.eval_duration !== 'number') {
    throw new Error('Ollama response did not include required eval metadata for reliable measurement.');
  }

  // Precision calculation using actual engine stats
  // Prompt TPS: prompt_eval_count / (prompt_eval_duration / 1e9)
  const promptTps = data.prompt_eval_count > 0 
    ? (data.prompt_eval_count / (data.prompt_eval_duration / 1_000_000_000)) 
    : 0;

  // Generation TPS: eval_count / (eval_duration / 1e9)
  const genTps = data.eval_count > 0 
    ? (data.eval_count / (data.eval_duration / 1_000_000_000)) 
    : 0;

  // TTFT (Time To First Token) is commonly approximated by prompt_eval_duration in some contexts, 
  // but here we'll use the total duration for simplicity or a specific slice if available.
  const ttftMs = data.prompt_eval_duration / 1_000_000; // Approximate TTFT as end of prompt processing

  return { promptTps, genTps, ttftMs };
}

/** Run context retention test — needle-in-haystack */
export async function runRetentionBench(
  model: string,
  baseUrl = 'http://localhost:11434',
): Promise<{ score: number; details: Array<{ category: string; name: string; passed: boolean; details?: Record<string, unknown> }> }> {
  if (process.env.BENCH_MOCK === 'true') {
    return { 
      score: 85, 
      details: [
        { category: 'retention', name: 'need500-start', passed: true, details: { contextSize: 500, position: 'start', response: 'The secret answer is SUPERWORD' } },
        { category: 'retention', name: 'need1000-middle', passed: true, details: { contextSize: 1000, position: 'middle', response: 'SUPERWORD found' } },
        { category: 'retention', name: 'need4000-end', passed: false, details: { contextSize: 4000, position: 'end', response: 'I cannot find it' } },
      ] 
    };
  }

  const contextSizes = [500, 1000, 4000];
  const positions = ['start', 'middle', 'end'];
  const tests: Array<{ category: string; name: string; passed: boolean; details?: Record<string, unknown> }> = [];
  let passedCount = 0;

  for (const size of contextSizes) {
    for (const pos of positions) {
      const needle = `The secret answer to this question is: SUPERWORD-${size}-${pos}`;
      const haystack = generateHaystack(size, needle, pos);
      const query = 'What is the secret answer?';

      try {
        const result = await queryModel(model, haystack + '\\n\\n' + query, baseUrl);
        const passed = result.includes('SUPERWORD');
        tests.push({
          category: 'retention',
          name: `need${size}-${pos}`,
          passed,
          details: { contextSize: size, position: pos, response: result.substring(0, 200) },
         });
        if (passed) passedCount++;
      } catch {
        tests.push({ category: 'retention', name: `need${size}-${pos}`, passed: false, details: { error: true } });
      }
    }
  }

  const total = tests.length;
  const score = total > 0 ? (passedCount / total) * 100 : 0;
  return { score, details: tests };
}

/** Run accuracy test — rule-based QA */
export async function runAccuracyBench(
  model: string,
  baseUrl = 'http://localhost:11434',
): Promise<{ score: number; details: Array<{ category: string; name: string; passed: boolean; details?: Record<string, unknown> }> }> {
  if (process.env.BENCH_MOCK === 'true') {
    return { 
      score: 70, 
      details: [
        { category: 'accuracy', name: 'What is 25 * 17?', passed: true, details: { expected: '425', response: '425' } },
        { category: 'accuracy', name: 'Capital of France', passed: true, details: { expected: 'Paris', response: 'Paris' } },
      ] 
    };
  }

  const questions: Array<{ question: string; answer: string; pattern: string }> = [
     { question: 'What is 25 * 17?', answer: '425', pattern: '425' },
     { question: 'List the prime numbers between 1 and 20, separated by commas.', answer: '2,3,5,7,11,13,17,19', pattern: '\\b2\\b.*\\b3\\b.*\\b5\\b.*\\b7\\b.*\\b11\\b.*\\b13\\b.*\\b17\\b.*\\b19\\b' },
     { question: 'What is the capital of France?', answer: 'Paris', pattern: 'Paris' },
     { question: 'How many letters are in the word \"supercalifragilisticexpialidocious\"?', answer: '34', pattern: '34' },
     { question: 'Calculate: 9.81 * 45 + 27.3 = ? Give just the number.', answer: '467.85', pattern: '(?:467\\.?\\d*)' },
     { question: 'What is the square root of 144?', answer: '12', pattern: '\\b12\\b' },
     { question: 'Name the planets between Earth and Saturn in order from the Sun.', answer: 'Mars, Jupiter', pattern: 'Mars.*Jupiter' },
     { question: 'What is the chemical symbol for Gold?', answer: 'Au', pattern: '\\bAu\\b' },
     { question: 'Convert 100 Celsius to Fahrenheit.', answer: '212', pattern: '212' },
     { question: 'How many seconds are in a non-leap year?', answer: '31536000', pattern: '31536000' },
  ];

  const tests: Array<{ category: string; name: string; passed: boolean; details?: Record<string, unknown> }> = [];
  let passedCount = 0;

  for (const q of questions) {
    try {
      const result = await queryModel(model, q.question, baseUrl);
      const passed = new RegExp(q.pattern).test(result);
      tests.push({
        category: 'accuracy',
        name: q.question.substring(0, 30),
        passed,
        details: { expected: q.answer, response: result.substring(0, 200) },
       });
      if (passed) passedCount++;
    } catch {
      tests.push({ category: 'accuracy', name: q.question.substring(0, 30), passed: false, details: { error: true } });
    }
  }

  const score = questions.length > 0 ? (passedCount / questions.length) * 100 : 0;
  return { score, details: tests };
}

/** Save run results to database in a single transaction */
export async function saveBenchRun(run: BenchRun): Promise<number> {
  await db`BEGIN TRANSACTION`;
  try {
    await db`INSERT INTO bench_runs (model_name, hardware, runtime, speed_prompt_tps, speed_gen_tps, speed_ttft_ms, retention_pct, accuracy_pct)\n      VALUES (${run.model}, ${run.hardware}, ${run.runtime}, ${run.promptTps}, ${run.genTps}, ${run.ttftMs}, ${run.retentionPct}, ${run.accuracyPct})`;

    const result = await db`SELECT last_insert_rowid() AS id`;
    const runId = (result as Array<{ id: number }>)[0].id;

    for (const test of run.retentionTests ?? []) {
      await db`INSERT INTO bench_tests (run_id, category, name, passed, details)\n        VALUES (${runId}, ${test.category}, ${test.name}, ${test.passed ? 1 : 0}, ${JSON.stringify(test.details)})`;
     }

    for (const test of run.accuracyTests ?? []) {
      await db`INSERT INTO bench_tests (run_id, category, name, passed, details)\n        VALUES (${runId}, ${test.category}, ${test.name}, ${test.passed ? 1 : 0}, ${JSON.stringify(test.details)})`;
     }

    for (const test of run.speedTests ?? []) {
      await db`INSERT INTO bench_tests (run_id, category, name, passed, details)\n        VALUES (${runId}, ${test.category}, ${test.name}, ${1}, ${JSON.stringify(test.details)})`;
     }

    await db`COMMIT`;
    return runId;
   } catch (err) {
    await db`ROLLBACK`;
    throw err;
   }
}

/** Stub implementations for testing without actual models */
export function stubModelList(): ModelInfo[] {
  return [
    { name: 'llama3.2:1b', size: '1.3G', digest: 'sha256:abc' },
    { name: 'qwen2:7b', size: '4.9G', digest: 'sha256:def' },
  ];
}

function generateHaystack(wordCount: number, needle: string, position: string): string {
  const fillers = [
    'Artificial intelligence is transforming modern technology.',
    'Machine learning models require significant computational resources.',
    'Natural language processing enables human-computer interaction.',
    'Deep neural networks are inspired by biological brains.',
    'Neural networks learn through backpropagation algorithms.',
    'The transformer architecture revolutionized natural language understanding.',
    'Large language models are trained on massive text corpora.',
    'Transfer learning allows models to adapt to new tasks efficiently.',
    'Computational efficiency is critical for model deployment.',
    'Benchmarking helps compare model performance across hardware.',
    'Model quantization reduces memory requirements significantly.',
    'Context window size affects how much information a model can process.',
  ];

  const parts: string[] = [];
  if (position === 'start') {
    parts.push(needle);
    for (let i = 0; i < wordCount; i++) parts.push(fillers[i % fillers.length]);
    return parts.join(' ');
  }
  if (position === 'end') {
    for (let i = 0; i < wordCount; i++) parts.push(fillers[i % fillers.length]);
    parts.push(needle);
    return parts.join(' ');
  }
  const half = Math.floor(wordCount / 2);
  for (let i = 0; i < half; i++) {
    parts.push(fillers[i % fillers.length]);
  }
  parts.push(needle);
  for (let i = half; i < wordCount; i++) {
    parts.push(fillers[i % fillers.length]);
  }
  return parts.join(' ');
}

async function queryModel(model: string, prompt: string, baseUrl: string): Promise<string> {
  const resp = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, stream: false, options: { num_predict: 256 } }),
  });
  if (!resp.ok) throw new Error(`Query failed: ${resp.status}`);
  const data = await resp.json() as { response?: string };
  return (data.response ?? '').trim();
}

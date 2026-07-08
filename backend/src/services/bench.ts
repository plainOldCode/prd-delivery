// src/services/bench.ts — High-precision benchmark runner

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

const OLLAMA_URL = 'http://localhost:11434/api/generate';

async function ollamaGenerate(modelName: string, prompt: string, baseUrl: string = 'http://localhost:11434'): Promise<any> {
  const endpoint = `${baseUrl}/api/generate`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: modelName, prompt: prompt, stream: false }),
  });
  if (!response.ok) throw new Error(`Ollama generate failed: ${response.status} ${response.statusText}`);
  return response.json();
}

export async function runSpeedBench(modelName: string, baseUrl: string = 'http://localhost:11434'): Promise<{ promptTps: number; genTps: number; ttftMs: number }> {
  const endpoint = `${baseUrl}/api/generate`;
  const prompt = "Explain the concept of quantum entanglement in three paragraphs.";

  console.log(`[Speed] Starting for model: ${modelName}`);

  const data = await ollamaGenerate(modelName, prompt, baseUrl);

  const prefillTps = data.prompt_eval_count > 0 && data.prompt_eval_duration ? 
    (data.prompt_eval_count / (data.prompt_eval_duration / 1e9)) : 0;
  const decodeTps = data.eval_count > 0 && data.eval_duration ? 
    (data.eval_count / (data.eval_duration / 1e9)) : 0;
  const ttftMs = data.prompt_eval_duration ? (data.prompt_eval_duration / 1e6) : 0;

  console.log(`[Speed] ${modelName} -> prefill: ${prefillTps.toFixed(2)} t/p, decode: ${decodeTps.toFixed(2)} t/s`);
  
  return { promptTps: prefillTps, genTps: decodeTps, ttftMs };
}

export async function runRetentionBench(modelName: string, baseUrl: string = 'http://localhost:11434'): Promise<{ score: number }> {
  const wordList = ["apple", "stone", "cloud", "stream", "mountain", "ocean", "forest", "river", "sky", "shadow"];
  let haystack = Array.from({ length: 2000 }, () => wordList[Math.floor(Math.random() * wordList.length)]).join(" ");

  const secretKey = `SECRET_KEY_${Math.random().toString(36).substring(7).toUpperCase()}`;
  const injectionPoint = Math.floor(haystack.length / 2);
  const modifiedHaystack = haystack.slice(0, injectionPoint) + ` ${secretKey} ` + haystack.slice(injectionPoint);

  const prompt = `${modifiedHaystack}\n\nQuestion: What is the unique SECRET KEY found in the text above? Answer only with that key.`;

  console.log(`[Retention] Testing for model: ${modelName}`);

  const data: { response?: string } = await ollamaGenerate(modelName, prompt, baseUrl);
  const success = data.response?.includes(secretKey) ?? false;
  const retentionPct = success ? 100 : 0;

  console.log(`[Retention] ${modelName} -> found: ${success} (${retentionPct}%)`);
  
  return { score: retentionPct };
}

export async function runAccuracyBench(modelName: string, baseUrl: string = 'http://localhost:11434'): Promise<{ score: number }> {
  const tasks = [
    { prompt: "If all roses are flowers and some flowers are red, is every rose red? Answer with 'Yes' or 'No'.", expected: "No" },
  ];

  const task = tasks[0];
  
  console.log(`[Accuracy] Testing for model: ${modelName}`);

  const data: { response?: string } = await ollamaGenerate(modelName, task.prompt, baseUrl);
  const outputText = (data.response ?? "").trim();
  const success = outputText.toLowerCase().includes(task.expected.toLowerCase());
  const accuracyPct = success ? 100 : 0;

  console.log(`[Accuracy] ${modelName} -> expected '${task.expected}', got: '${outputText}' (${accuracyPct}%)`);
  
  return { score: accuracyPct };
}

export const listModelsSNIPPET = {
  ollama: [{ name: 'llama3', size: '8b' }, { name: 'mistral', size: '7b' }],
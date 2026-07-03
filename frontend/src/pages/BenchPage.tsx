// src/pages/BenchPage.tsx — Benchmark 대시보드 (다크 테마)
import { useState } from 'react';
import { useModels, useHardware, useRunBenchmark } from '../hooks/useBench';

/* ---------- Model Badge ---------- */
function ModelBadge({ name }: { name: string }) {
  const [selected, setSelected] = useState(false);
  return (
    <button
      type="button"
      className={`px-3 py-1.5 rounded-lg text-sm font-mono transition-colors ${
        selected
          ? 'bg-red-600 text-white'
          : 'bg-neutral-800 text-gray-300 hover:bg-neutral-700'
      }`}
      onClick={() => setSelected(true)}
    >
      {name}
    </button>
  );
}

/* ---------- Stat Card ---------- */
function StatCard({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="bg-neutral-900 rounded-xl p-4 border border-neutral-800">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-white">
        {value}
        {unit && <span className="text-sm text-red-400 ml-1">{unit}</span>}
      </p>
    </div>
  );
}

/* ---------- Progress Bar ---------- */
function ProgressBar({ progress, running }: { progress: string; running: boolean }) {
  if (!running && !progress) return null;
  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-2">
        {running && (
          <svg className="animate-spin h-4 w-4 text-red-500" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
          </svg>
        )}
        <span className={`text-sm font-mono ${running ? 'text-red-400' : 'text-green-400'}`}>
          {progress || ''}
        </span>
      </div>
      {running && (
        <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
          <div className="h-full bg-red-500 animate-pulse w-2/5"/>
        </div>
      )}
    </div>
  );
}

/* ---------- Results Panel ---------- */
function ResultsPanel({ result }: { result: any }) {
  if (!result) return null;
  const { model, speed, retention, accuracy } = result;

  return (
    <div className="mt-6 bg-neutral-900 rounded-xl border border-neutral-800 p-6">
      <h3 className="text-lg font-bold text-white mb-1">{model}</h3>
      {result.hardware && <p className="text-xs text-gray-500 mb-4">{result.hardware}</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <StatCard label="Prompt TPS" value={speed?.promptTps ?? '-'} unit="tok/s"/>
        <StatCard label="Gen TPS" value={speed?.genTps ?? '-'} unit="tok/s"/>
        <StatCard label="TTFT" value={speed?.ttftMs ?? '-'} unit="ms"/>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StatCard label="Retention Score" value={retention?.score ?? '-'} unit="%" />
        <StatCard label="Accuracy Score" value={accuracy?.score ?? '-'} unit="%" />
      </div>
    </div>
  );
}

/* ---------- Main Page ---------- */
export default function BenchPage() {
  const { data: modelsData, loading: modelsLoading, error: modelsError } = useModels();
  const { data: hwData, loading: hwLoading, error: hwError } = useHardware();
  const [selectedModel, setSelectedModel] = useState<string>('');
  const { result, running, error: runError, progress, run } = useRunBenchmark();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-gray-200">
      {/* Header */}
      <header className="border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Benchmark</h1>
        <div className="flex gap-4 text-sm">
          <a href="/bench/history" className="text-gray-400 hover:text-white transition">History</a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Hardware Info */}
        <section className="bg-neutral-900 rounded-xl border border-neutral-800 p-5">
          <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Hardware</h2>
          {hwLoading ? (
            <p className="text-gray-500 animate-pulse">Detecting…</p>
          ) : hwError ? (
            <p className="text-red-400 text-sm">{hwError}</p>
          ) : hwData ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Chip" value={hwData.chip} />
              <StatCard label="Physical Cores" value={hwData.cpuCoresPhysical} />
              <StatCard label="Logical Cores" value={hwData.cpuCoresLogical} />
              <StatCard label="RAM" value={(hwData.ramBytes / (1024**3)).toFixed(1)} unit="GB"/>
            </div>
          ) : null}
        </section>

        {/* Models */}
        <section className="bg-neutral-900 rounded-xl border border-neutral-800 p-5">
          <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Models</h2>
          {modelsLoading ? (
            <p className="text-gray-500 animate-pulse">Loading models…</p>
          ) : modelsError ? (
            <p className="text-red-400 text-sm">{modelsError}</p>
          ) : modelsData?.models?.length ? (
            <div className="flex flex-wrap gap-2">
              {modelsData.models.map((m: any) => (
                <button
                  key={m.name}
                  type="button"
                  className={`px-3 py-1.5 rounded-lg text-sm font-mono transition-colors ${
                    selectedModel === m.name
                      ? 'bg-red-600 text-white'
                      : 'bg-neutral-800 text-gray-300 hover:bg-neutral-700'
                  }`}
                  onClick={() => setSelectedModel(m.name)}
                >
                  {m.name}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No models found. Start Ollama or MLX serving.</p>
          )}
        </section>

        {/* Run Benchmark Card */}
        <section className="bg-neutral-900 rounded-xl border border-neutral-800 p-5">
          <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Run Benchmark</h2>

          {selectedModel ? (
            <p className="text-white mb-4 font-mono">Selected: {selectedModel}</p>
          ) : (
            <p className="text-gray-500 mb-4 text-sm">↑ Above에서 테스트할 모델을 선택하세요.</p>
          )}

          <button
            type="button"
            disabled={!selectedModel || running}
            className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors ${
              selectedModel && !running
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-neutral-800 text-gray-500 cursor-not-allowed'
            }`}
            onClick={() => run(selectedModel)}
          >
            {running ? 'Running…' : 'Start Benchmark'}
          </button>

          {/* Error */}
          {runError && (
            <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
              {runError}
            </div>
          )}

          {/* Progress */}
          <ProgressBar progress={progress} running={running} />
        </section>

        {/* Results */}
        {result && <ResultsPanel result={result} />}
      </main>
    </div>
  );
}
// src/pages/BenchResultPage.tsx — Detailed Benchmark Report (Vibe-Sleek Dark)
import { useParams } from 'react-router-dom';
import { useBenchDetail } from '../hooks/useBench';

/* ---------- Metric Gauge ---------- */
function MetricGauge({ label, value, unit }: { label: string; value: number; unit?: string }) {
  // Calculate rotation angle for the gauge (0 to 180 degrees)
  const angle = (value / 100) * 180;
  const colorClass = value > 80 ? 'text-green-400' : value > 50 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="flex flex-col items-center text-center p-4 bg-neutral-900 rounded-2xl border border-neutral-800">
      <div className="relative w-32 h-16 overflow-hidden mb-2">
        {/* Background Arc */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 50">
          <path 
            d="M 10,50 A 40,40 0 0,1 90,50" 
            fill="none" 
            stroke="#262626" 
            strokeWidth="8" 
            strokeLinecap="round" 
          />
        </svg>
        {/* Active Arc */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 50">
          <path 
            d="M 10,50 A 40,40 0 0,1 90,50" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="8" 
            strokeLinecap="round" 
            className={colorClass}
            style={{ strokeDasharray: `125.6 ${125.6 * (1 - value / 100)}` }} // Simplified arc length logic
          />
        </svg>
      </div>
      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colorClass}`}>{value}{unit}</p>
    </div>
  );
}

/* ---------- Test Case Item ---------- */
function TestCaseRow({ test }: { test: any }) {
  const isSuccess = test.result === 'pass';
  return (
    <div className="flex items-center justify-between p-3 border-b border-neutral-800 last:border-none hover:bg-neutral-800/50 transition">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-mono text-gray-300">{test.name}</span>
        <span className="text-xs text-gray-500">{test.description}</span>
      </div>
      <div className="flex items-center gap-3">
        {test.latency && <span className="text-xs font-mono text-gray-400">{test.latency}ms</span>}
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${isSuccess ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
          {isSuccess ? 'Pass' : 'Fail'}
        </span>
      </div>
    </div>
  );
}

/* ---------- Main Page ---------- */
export default function BenchResultPage() {
  const { id } = useParams<{ id: string }>();
  const { data: detail, loading, error } = useBenchDetail(Number(id));

  if (loading) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-gray-500">Loading report...</div>;
  if (error) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-red-400">{error}</div>;
  if (!detail) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-gray-500">Run not found.</div>;

  const { run, tests } = detail;
  const { prompt_tps, gen_tps, ttft_ms, retention_pct, accuracy_pct } = run;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-gray-200 font-sans">
      {/* Header */}
      <header className="border-b border-neutral-800 px-6 py-4 flex items-center justify-between sticky top-0 bg-[#0A0A0A]/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <a href="/bench" className={`p-2 rounded-full hover:bg-neutral-800 transition ${loading ? 'text-gray-500' : 'text-white'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19L5 14L10 9M15 19l5-5-5-5" />
            </svg>
          </a>
          <h1 className="text-lg font-bold text-white">Benchmark Report</h1>
        </div>
        <div className="text-xs font-mono text-gray-500">
          RUN ID: <span className="text-gray-300">{run.run_id}</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Summary Section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-neutral-900 rounded-3xl border border-neutral-800 p-8 flex flex-col justify-center relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-red-600/10 blur-[60px] rounded-full" />
            
            <h2 className="text-3xl font-bold text-white mb-2">{run.model}</h2>
            <p className="text-gray-500 mb-6 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H3a2 2 0 01-2-2V5a2 2 0 012-2h18a2 2 0 012 2v14a2 2 0 01-2 2z" />
              </svg>
              {run.hardware}
            </p>

            <div className="flex gap-4 items-center">
              <div className="px-3 py-1 bg-red-600 text-white rounded-full text-xs font-bold uppercase tracking-tighter">
                Tier: {retention_pct! > 90 ? 'S' : retention_pct! > 70 ? 'A' : 'B'}
              </div>
              <span className="text-gray-600 text-xs">•</span>
              <span className="text-gray-500 text-xs">{run.runtime} / {run.created_at}</span>
            </div>
          </div>

          <div className="bg-neutral-900 rounded-3xl border border-neutral-800 p-6 flex flex-col justify-between">
            <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Quick Score</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                <span className="text-xs text-gray-500">Retention</span>
                <span className={`font-mono font-bold ${retention_pct! > 70 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {retention_pct}%
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                <span className="text-xs text-gray-500">Accuracy</span>
                <span className={`font-mono font-bold ${accuracy_pct! > 70 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {accuracy_pct}%
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Metrics Grid */}
        <section className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <MetricGauge label="Retention" value={retention_pct || 0} />
          <MetricGauge label="Accuracy" value={accuracy_pct || 0} />
          <MetricGauge label="TFT Speed" value={(ttft_ms || 0) / 10} /> {/* Normalize for gauge */}
        </section>

        {/* Detailed Test Cases */}
        <section className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-white">Test Case Details</h3>
            <span className="text-xs text-gray-500">Total {tests.length} tests executed</span>
          </div>
          <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden">
            {tests.length > 0 ? (
              tests.map((test, idx) => <TestCaseRow key={idx} test={test} />)
            ) : (
              <div className="p-10 text-center text-gray-500 text-sm">No detailed test data available for this run.</div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

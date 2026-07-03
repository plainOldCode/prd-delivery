// src/pages/BenchHistoryPage.tsx — Benchmark history list (다크 테마)
import { Link } from 'react-router-dom';
import { useHistory } from '../hooks/useBench';

/* ---------- Row ---------- */
function HistoryRow({ run }: { run: any }) {
  const date = new Date(run.created_at).toLocaleString();
  return (
    <Link
      to={{ pathname: `/bench/${run.rowid ?? run.id}` }}
      className="flex items-center gap-4 bg-neutral-900 hover:bg-neutral-800 rounded-xl p-4 border border-transparent hover:border-neutral-700 transition-colors"
    >
      {/* Model */}
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold truncate">{run.model}</p>
        <p className="text-xs text-gray-500 mt-0.5">{run.hardware ?? '-'}</p>
      </div>

      {/* Scores */}
      <div className="flex gap-4 text-sm text-gray-400 font-mono">
        <span title="Prompt TPS">{run.prompt_tps?.toFixed(1) ?? '-'} t/s</span>
        <span title="Gen TPS">{run.gen_tps?.toFixed(1) ?? '-'} t/s</span>
        {run.retention_pct != null && <span title="Retention">{run.retention_pct.toFixed(1)}%</span>}
        {run.accuracy_pct != null && <span title="Accuracy">{run.accuracy_pct.toFixed(1)}%</span>}
      </div>

      {/* Timestamp */}
      <div className="text-right text-xs text-gray-500 whitespace-nowrap">
        {date}
        <p className="mt-0.5">{run.runtime ?? '-'}</p>
      </div>
    </Link>
  );
}

/* ---------- Detail Page (inline to avoid extra file) ---------- */
function BenchDetailPage({ runId }: { runId: number }) {
  const { data, loading, error } = useHistory();
  const run = data?.runs.find((r) => r.id === runId || r.rowid === runId);

  if (loading) return <LoadingState />;
  if (error) return <ErrorBanner message={error} />;

  if (!run) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-gray-200 flex items-center justify-center">
        <p className="text-gray-500">Benchmark 결과를 찾을 수 없습니다.</p>
      </div>
    );
  }

  const date = new Date(run.created_at).toLocaleString();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-gray-200">
      <header className="border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Benchmark Detail</h1>
        <a href="/bench/history" className="text-sm text-gray-400 hover:text-white transition">← Back to History</a>
      </header>
      <main className="max-w-3xl mx-auto p-6 space-y-4">
        <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-5 space-y-2">
          <h2 className="text-lg font-bold text-white">{run.model}</h2>
          <p className="text-sm text-gray-500">{run.hardware ?? '-'} · {date} · {run.runtime ?? '-'}</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
            <Stat label="Prompt TPS" value={run.prompt_tps?.toFixed(1) ?? '-'} unit="tok/s"/>
            <Stat label="Gen TPS" value={run.gen_tps?.toFixed(1) ?? '-'} unit="tok/s"/>
            <Stat label="TTFT" value={run.ttft_ms?.toFixed(0) ?? '-'} unit="ms"/>
            <Stat label="Retention" value={run.retention_pct?.toFixed(1) ?? '-'} unit="%" />
            <Stat label="Accuracy" value={run.accuracy_pct?.toFixed(1) ?? '-'} unit="%" />
          </div>
        </div>
      </main>
    </div>
  );
}

/* ---------- Shared Components ---------- */
function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="bg-black rounded-lg p-3 border border-neutral-800">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-lg font-bold text-white">
        {value}
        {unit && <span className="text-sm text-red-400 ml-1">{unit}</span>}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-gray-200 flex items-center justify-center">
      <div className="text-center space-y-3">
        <svg className="animate-spin h-6 w-6 text-red-500 mx-auto" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
        </svg>
        <p className="text-gray-500 animate-pulse">Loading history…</p>
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-gray-200 flex items-center justify-center">
      <p className="text-red-400">{message}</p>
    </div>
  );
}

/* ---------- Main History Page ---------- */
export default function BenchHistoryPage() {
  const { data, loading, error } = useHistory();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-gray-200">
      {/* Header */}
      <header className="border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Benchmark History</h1>
        <a href="/bench" className="text-sm text-gray-400 hover:text-white transition">← Run New Benchmark</a>
      </header>

      {/* Body */}
      <main className="max-w-4xl mx-auto p-6 space-y-3">
        {loading && <LoadingState />}

        {error && !data && (
          <div className="p-4 bg-red-900/30 border border-red-800 rounded-xl text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && data?.runs?.length === 0 && (
          <p className="text-gray-500 text-center py-12">Benchmark 기록이 없습니다.</p>
        )}

        {data?.runs?.map((row) => (
          <HistoryRow key={row.id ?? row.rowid} run={row} />
        ))}
      </main>
    </div>
  );
}

/* ---------- Export for App.tsx ---------- */
export { BenchDetailPage };
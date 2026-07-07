import { Link } from 'react-router-dom';

export default function HomePage() {
	return (
		<div className="max-w-4xl mx-auto py-12">
			<div className="text-center mb-12">
				<h1 className="text-3xl font-bold text-slate-900 mb-4">LLM Benchmark Dashboard</h1>
				<p className="text-lg text-slate-600 max-w-2xl mx-auto">로컬 LLM 모델의 성능을 측정하고 비교할 수 있는 대시보드입니다.</p>
			</div>

			<div className="grid md:grid-cols-3 gap-6 mb-12">
				<Link to="/bench" className="block p-6 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition" data-testid="card-benchmark">
					<h2 className="text-lg font-semibold text-slate-900 mb-2">벤치마크 실행</h2>
					<p className="text-sm text-slate-600">모델의 추론 성능을 측정하세요. prompt TPS, gen TPS, TTFT를 확인합니다.</p>
				</Link>

				<Link to="/bench/history" className="block p-6 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition" data-testid="card-history">
					<h2 className="text-lg font-semibold text-slate-900 mb-2">이력 확인</h2>
					<p className="text-sm text-slate-600">이전 벤치 결과들을 비교하고 추이 분석을 합니다.</p>
				</Link>

				<Link to="/tasks" className="block p-6 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition" data-testid="card-tasks">
					<h2 className="text-lg font-semibold text-slate-900 mb-2">작업 관리</h2>
					<p className="text-sm text-slate-600">프로젝트 작업 현황을 확인하고 관리합니다.</p>
				</Link>
			</div>

			<div className="text-center py-8 border-t border-slate-200">
				<p className="text-sm text-slate-500">Stack: Hono + Bun (BE) · React 19 + Vite 6 (FE) · SQLite</p>
			</div>
		</div>
	);
}

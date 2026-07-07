import { BrowserRouter, Routes, Route, useParams, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import TasksPage from './pages/TasksPage';
import BenchPage from './pages/BenchPage';
import BenchHistoryPage, { BenchDetailPage } from './pages/BenchHistoryPage';

/* ---------- BenchDetail wrappers — extract runId from URL ---------- */
function BenchDetailWrapper() {
	const { runId } = useParams<{ runId: string }>();
	return <BenchDetailPage runId={Number(runId)} />;
}

/* ---------- Layout with Header ---------- */
function Layout({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-screen bg-slate-50">
			<header className="bg-white shadow-sm px-6 py-3 flex items-center justify-between">
				<nav className="space-x-4">
					<Link to="/" className="text-slate-700 hover:text-blue-600">Home</Link>
					<Link to="/tasks" className="text-slate-700 hover:text-blue-600">Tasks</Link>
					<Link to="/bench" className="text-slate-700 hover:text-blue-600">Benchmark</Link>
					<Link to="/bench/history" className="text-slate-700 hover:text-blue-600">History</Link>
				</nav>
			</header>
			<main className="p-6">{children}</main>
		</div>
	);
}

/* ---------- App Router ---------- */
export default function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<Layout><HomePage /></Layout>} />
				<Route path="/tasks" element={<Layout><TasksPage /></Layout>} />
				<Route path="/bench" element={<Layout><BenchPage /></Layout>} />
				<Route path="/bench/history" element={<Layout><BenchHistoryPage /></Layout>} />
				<Route path="/bench/:runId" element={<Layout><BenchDetailWrapper /></Layout>} />
				{/* /results/:runId — same detail page (legacy URL alias) */}
				<Route path="/results/:runId" element={<BenchDetailWrapper />} />
			</Routes>
		</BrowserRouter>
	);
}

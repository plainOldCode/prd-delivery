import { useEffect, useState } from 'react';
import { get } from '../util/request.util';

interface Task {
	id: number;
	title: string;
	status: string;
	customerRequest?: string;
	requestedWork?: string;
	targetDeliveryDate?: string;
	buildEstimate?: string;
	ownerName?: string;
}

export default function TasksPage() {
	const [tasks, setTasks] = useState<Task[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		get<Task[]>('/tasks')
				.then((data) => { setTasks(data); setLoading(false); })
						.catch((err: Error) => { setError(err.message); setLoading(false); });
	}, []);

	if (loading) return <p className="text-center py-8 text-slate-500">Loading...</p>;
	if (error) return <p className="text-center py-8 text-red-500" data-testid="tasks-error">{error}</p>;

	return (
			<div>
				<h2 className="text-xl font-bold mb-4">Tasks</h2>
				{tasks.length === 0 ? (
					<p className="text-center py-8 text-slate-500">No tasks yet.</p>
				) : (
						tasks.map((task) => (
								<div key={task.id} className="p-4 mb-3 bg-white rounded-lg border border-slate-200 shadow-sm" data-testid={`task-${task.id}`}>
									<div className="flex items-center gap-2">
										<strong className="text-slate-900">{task.title}</strong>
										{task.status && <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">{task.status}</span>}
									</div>
									{task.customerRequest && (
											<p className="mt-2 text-sm text-slate-600">{task.customerRequest}</p>
									)}
								</div>
						))
				)}
			</div>
	);
}

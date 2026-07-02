const API_BASE = '/api';

export interface Task {
  id: number;
  title: string;
  status: string;
  customerRequest?: string;
  requestedWork?: string;
  targetDeliveryDate?: string;
  buildEstimate?: string;
  ownerName?: string;
}

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export const fetchTasks = () => json<Task[]>(`${API_BASE}/tasks`);

export const fetchTask = (id: number) => json<Task>(`${API_BASE}/tasks/${id}`);

export const createTask = (payload: Omit<Task, 'id'>) =>
  json<Task>(`${API_BASE}/tasks`, { method: 'POST', body: JSON.stringify(payload) });

export const updateTask = (id: number, payload: Partial<Task>) =>
  json<Task>(`${API_BASE}/tasks/${id}`, { method: 'PUT', body: JSON.stringify(payload) });

export const deleteTask = (id: number) =>
  json<{ deleted: boolean }>(`${API_BASE}/tasks/${id}`, { method: 'DELETE' });

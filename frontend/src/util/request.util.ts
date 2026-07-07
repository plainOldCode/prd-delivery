// src/util/request.util.ts — API 요청 유틸리티 (auth-free)
const API_BASE = import.meta.env.VITE_API_URL || '/api';

/** 전체 API URL 생성 — /api/xxx를 VITE_API_URL(절대 또는 상대)로 resolved */
export function getApiUrl(path: string): string {
	if (path.startsWith('http://') || path.startsWith('https://')) return path;
	const clean = path.startsWith('/api/') ? path.slice(4) : path;
	return `${API_BASE}${clean}`;
}

type RequestInitExtra = Omit<RequestInit, 'headers'> & { headers?: Record<string, string> };

/** API 경로 앞에 `/api` 붙이는 fetch 래퍼 */
export async function request<T>(url: string, init?: RequestInitExtra): Promise<T> {
	const fullUrl = url.startsWith('/api') ? url : `${API_BASE}${url}`;

	const res = await fetch(fullUrl, {
		...init,
		headers: {
			'Content-Type': 'application/json',
			...(init?.headers ?? {}),
		},
	});

	if (!res.ok) {
		const body = await res.json().catch(() => ({ error: res.statusText }));
		throw new Error(body.error ?? `${res.status} ${res.statusText}`);
	}

	// 빈 응답 (DELETE 등)은 null 반환
	const ct = res.headers.get('content-type');
	if (ct?.includes('application/json')) {
		return res.json();
	}
	return null as T;
}

/** GET 요청 */
export function get<T>(url: string, init?: RequestInitExtra) {
	return request<T>(url, { ...init, method: 'GET' });
}

/** POST 요청 — body는 자동으로 JSON.stringify */
export function post<T>(url: string, body: unknown, init?: RequestInitExtra) {
	return request<T>(url, {
		...init,
		method: 'POST',
		body: JSON.stringify(body),
	});
}

/** PUT 요청 */
export function put<T>(url: string, body: unknown, init?: RequestInitExtra) {
	return request<T>(url, {
		...init,
		method: 'PUT',
		body: JSON.stringify(body),
	});
}

/** DELETE 요청 */
export function deleteRequest<T>(url: string, init?: RequestInitExtra) {
	return request<T>(url, { ...init, method: 'DELETE' });
}

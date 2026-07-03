// src/util/request.util.ts — API 요청 유틸리티 (Bearer 토큰 자동 첨부)
const API_BASE = '/api';
const TOKEN_KEY = 'auth_token';

/** API 경로 앞에 `/api` 붙이고 Bearer 토큰을 자동으로 추가하는 fetch 래퍼 */
export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const fullUrl = url.startsWith('/api') ? url : `${API_BASE}${url}`;
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;

  const res = await fetch(fullUrl, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `${res.status} ${res.statusText}`);
  }

  // 빈 응답 (DELETE 등)은 null 반환
  const ct = res.headers.get('content-type');
  if (ct && ct.includes('application/json')) {
    return res.json();
  }
  return null as T;
}

/** GET 요청 */
export function get<T>(url: string, init?: RequestInit) {
  return request<T>(url, { ...init, method: 'GET' });
}

/** POST 요청 — body는 자동으로 JSON.stringify */
export function post<T>(url: string, body: unknown, init?: RequestInit) {
  return request<T>(url, {
    ...init,
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** PUT 요청 */
export function put<T>(url: string, body: unknown, init?: RequestInit) {
  return request<T>(url, {
    ...init,
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/** DELETE 요청 */
export function del<T>(url: string, init?: RequestInit) {
  return request<T>(url, { ...init, method: 'DELETE' });
}

// src/auth/AuthContext.tsx — JWT 인증 컨텍스트
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export interface AuthUser {
  id: number;
  username: string;
}

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const stored = localStorage.getItem(USER_KEY);
    if (token && stored) {
      try { setUser(JSON.parse(stored)); } catch { /* bad json */ }
    }
    setLoading(false);
  }, []);

  const setAuth = useCallback((token: string, u: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setUser(u);
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const login = async (username: string, password: string) => {
    const res = await fetch('/api/auth/signin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? 'Login failed');
    const { token } = await res.json();
    setAuth(token, { id: 0, username });
  };

  const signup = async (username: string, password: string, confirmPassword: string) => {
    if (password !== confirmPassword) throw new Error('Passwords do not match');
    const res = await fetch('/api/auth/signup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, confirmPassword }),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? 'Signup failed');
    const data = await res.json();
    setAuth('', { id: data.id, username: data.username });
  };

  const logout = async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      await fetch('/api/auth/signout', {
        method: 'POST', headers: { authorization: `Bearer ${token}` },
       }).catch(() => {});
    }
    clearAuth();
  };

  return (
    <Ctx.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

// authFetch — Bearer 토큰 자동 첨부
export async function authFetch(url: string, init?: RequestInit) {
  const token = localStorage.getItem(TOKEN_KEY);
  return fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
}

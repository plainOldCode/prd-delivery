// src/App.tsx — Router + Auth context + Profile menu
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import HomePage from './pages/HomePage';
import TasksPage from './pages/TasksPage';
import { AuthPage } from './pages/AuthPage';

/* ---------- ProtectedRoute ---------- */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

/* ---------- Profile Dropdown ---------- */
function ProfileMenu() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div data-testid="profile-menu" className="relative group">
      <button id="profile-button" className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 transition">
        <span className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">
          {user.username[0].toUpperCase()}
        </span>
        <span data-testid="profile-username" className="text-sm font-medium text-slate-700">{user.username}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        <button type="button" onClick={() => { logout(); window.location.href = '/'; }} className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-lg transition">
          Sign Out
        </button>
      </div>
    </div>
  );
}

/* ---------- Layout with Header ---------- */
function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm px-6 py-3 flex items-center justify-between">
        <nav className="space-x-4">
          <a href="/" className="text-slate-700 hover:text-blue-600">Home</a>
          <a href="/tasks" className="text-slate-700 hover:text-blue-600">Tasks</a>
        </nav>
        <ProfileMenu />
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}

/* ---------- App Router ---------- */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/" element={<ProtectedRoute><Layout><HomePage /></Layout></ProtectedRoute>} />
          <Route path="/tasks" element={<ProtectedRoute><Layout><TasksPage /></Layout></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

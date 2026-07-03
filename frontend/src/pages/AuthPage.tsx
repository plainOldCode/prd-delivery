// src/pages/AuthPage.tsx - 로그인 / 회원가입 페이지 (토글)
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function AuthPage() {
  const { login, signup, user } = useAuth();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  // If already logged in, redirect away from /auth
  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isSignup && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      if (isSignup) {
        await signup(username, password, confirmPassword);
       } else {
        await login(username, password);
       }
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auth failed.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <form onSubmit={handleSubmit} className="w-full max-w-sm p-8 bg-white rounded-2xl shadow-lg">
        <h1 data-testid="auth-heading" className="text-2xl font-bold text-center mb-6">
          {isSignup ? 'Sign Up' : 'Sign In'}
        </h1>

        {error && (
          <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded" data-testid="auth-error">
            {error}
          </div>
        )}

        <label htmlFor="username" className="block text-sm font-medium mb-1">Username</label>
        <input
          id="username"
          required
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-2 mb-4 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
        />

        <label htmlFor="password" className="block text-sm font-medium mb-1">Password</label>
        <input
          id="password"
          required
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 mb-4 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
        />

        {isSignup && (
          <>
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">Confirm Password</label>
            <input
              id="confirmPassword"
              required
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-2 mb-4 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </>
        )}

        <button type="submit" className="w-full py-2 mt-2 font-semibold text-white bg-blue-600 rounded hover:bg-blue-700">
          {isSignup ? 'Sign Up' : 'Sign In'}
        </button>

        <p className="mt-4 text-center text-sm">
          {isSignup ? (
            <>Already have an account?{' '}
              <button type="button" onClick={() => setIsSignup(false)} className="text-blue-600 underline">
                Sign In
              </button>
            </>
          ) : (
            <>Don't have an account?{' '}
              <button type="button" onClick={() => setIsSignup(true)} className="text-blue-600 underline">
                Sign Up
              </button>
            </>
          )}
        </p>
      </form>
    </div>
  );
}

// src/pages/AuthPage.tsx — 로그인 / 회원가입 페이지 (토글)
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';

export function AuthPage() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signin') await login(username, password);
      else await signup(username, password, confirmPw);
     } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
     } finally {
      setLoading(false);
     }
   };

  const isSignup = mode === 'signup';

  return (
     <div className="min-h-screen flex items-center justify-center bg-slate-100">
       <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
         <h1 className="text-2xl font-bold text-center mb-6">
           {isSignup ? 'Sign Up' : 'Sign In'}
         </h1>

         {error && (
             <div className="bg-red-50 text-red-700 px-4 py-2 rounded-md mb-4 text-sm">
               {error}
             </div>
           )}

         <form onSubmit={handleSubmit} className="space-y-4">
           <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
            <input
                 type="text" required autoComplete="username"
                value={username} onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                 />
           </div>

           <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
             <input type="password" required autoComplete={isSignup ? 'new-password' : 'current-password'}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
               />
           </div>

           {isSignup && (
              <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Re-password</label>
                <input type="password" required autoComplete="new-password"
                    value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
                   className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
              </div>
             )}

          <button type="submit" disabled={loading}
               className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg disabled:opacity-50 transition">
            {loading ? '...' : isSignup ? 'Sign Up' : 'Sign In'}
          </button>

         <div className="text-center text-sm text-slate-500 mt-4">
           {isSignup ? (
              <>Already have an account?{' '}
                <button type="button" onClick={() => { setMode('signin'); setError(''); }}
                    className="text-blue-600 hover:underline">Sign In</button>
               </>
             ) : (
              <>Don't have an account?{' '}
               <button type="button" onClick={() => { setMode('signup'); setError(''); }}
                   className="text-blue-600 hover:underline">Sign Up</button>
              </>
           )}
         </div>
        </form>
       </div>
     </div>
   );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from '../utils/api';
import { isAdmin, saveAdminUser, saveAdminSessionId } from '../utils/auth';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (isAdmin()) navigate('/admin');
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await adminLogin({ email, password });
      // Backend set the httpOnly auth cookie; we only stash non-sensitive
      // admin profile info locally so the dashboard can render before /profile.
      saveAdminUser(data);
      if (data.sessionId) saveAdminSessionId(data.sessionId);
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid admin credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#131921] px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-brand-gold text-xl font-extrabold text-black">CN</span>
          <h1 className="mt-3 text-2xl font-extrabold text-white">Cindy Nat Enterprise</h1>
          <p className="mt-1 text-sm text-slate-400">Admin Portal</p>
        </div>

        {/* Card */}
        <div className="rounded-xl bg-white p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-slate-900">Sign in to Admin Panel</h2>
          <p className="mt-1 text-sm text-slate-500">Authorised personnel only</p>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              <i className="fas fa-exclamation-triangle"></i> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@example.com"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-gold focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm outline-none focus:border-brand-gold focus:bg-white"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                  <i className={showPass ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-full bg-brand-gold py-3 text-sm font-extrabold text-black transition hover:bg-yellow-400 disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign in to Admin Panel'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            This area is restricted to authorised administrators only.
          </p>
          <p className="mt-3 text-center text-xs text-slate-400">
            Forgot your admin password?{' '}
            <button
              type="button"
              onClick={() => alert('To reset your admin password:\n\n1. Go to your Render dashboard\n2. Open your backend service → Environment\n3. Update ADMIN_PASSWORD to a new value\n4. Save Changes and wait for redeploy\n\nThen log in with the new password.')}
              className="font-semibold text-brand-gold hover:underline"
            >
              How to reset
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

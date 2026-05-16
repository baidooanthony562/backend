import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { loginUser, resendVerification } from '../utils/api';
import { isAuthenticated } from '../utils/auth';
import { showToast } from '../components/Toast';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const rawRedirect = new URLSearchParams(location.search).get('redirect') || '/';
  const isSafeRedirect = (p) => {
    if (!p || !p.startsWith('/') || p.startsWith('//')) return false;
    try { return new URL(p, 'https://x').hostname === 'x'; } catch { return false; }
  };
  const redirectTo = isSafeRedirect(rawRedirect) ? rawRedirect : '/';

  useEffect(() => { if (isAuthenticated()) navigate('/'); }, [navigate]);

  const resetSuccess = location.state?.resetSuccess || false;
  const [email, setEmail] = useState(location.state?.email || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [notVerified, setNotVerified] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendDone, setResendDone] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    setNotVerified(false);
    try {
      const { data } = await loginUser({ email, password });
      localStorage.setItem('cindyNutToken', data.token);
      localStorage.setItem('cindyNutUser', JSON.stringify(data));
      window.dispatchEvent(new Event('storage'));
      showToast(`Welcome back, ${data.name?.split(' ')[0] || 'there'}!`);
      navigate(redirectTo);
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid email or password. Please try again.';
      if (err.response?.status === 403 && msg.toLowerCase().includes('verify')) {
        setNotVerified(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await resendVerification(email);
      setResendDone(true);
    } catch {
      setResendDone(true); // generic response — always show success
    } finally {
      setResending(false);
    }
  };

  return (
    <section className="mx-auto max-w-md px-4 pb-24 pt-8 md:px-0">
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gold text-lg font-extrabold text-black">CN</span>
          <h1 className="mt-3 text-2xl font-extrabold text-slate-900">Sign in to your account</h1>
          <p className="mt-1 text-sm text-slate-500">Access your orders, wishlist and dashboard.</p>
        </div>

        {resetSuccess && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
            <span>✓</span> Password reset successfully. Sign in with your new password.
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>⚠️</span> {error}
          </div>
        )}

        {notVerified && (
          <div className="mb-4 rounded-lg bg-amber-50 px-4 py-4 text-sm text-amber-800">
            <p className="font-semibold">Email not verified</p>
            <p className="mt-1">Please check your inbox and click the verification link before signing in.</p>
            {resendDone ? (
              <p className="mt-2 font-semibold text-green-700">New verification link sent — check your inbox.</p>
            ) : (
              <button
                onClick={handleResend}
                disabled={resending}
                className="mt-2 rounded-full bg-amber-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-60"
              >
                {resending ? 'Sending...' : 'Resend verification email'}
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
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
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 pr-11 text-sm outline-none focus:border-brand-gold focus:bg-white"
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-brand-gold py-3 text-sm font-extrabold text-black transition hover:bg-yellow-400 disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between text-sm">
          <Link to="/register" className="font-semibold text-[#C7511F] hover:underline">Create account</Link>
          <Link to="/forgot-password" className="text-slate-500 hover:underline">Forgot password?</Link>
        </div>
      </div>
    </section>
  );
}

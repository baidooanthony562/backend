import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../utils/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-md px-4 pb-24 pt-8 md:px-0">
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gold text-lg font-extrabold text-black">CN</span>
          <h1 className="mt-3 text-2xl font-extrabold text-slate-900">Forgot your password?</h1>
          <p className="mt-1 text-sm text-slate-500">Enter your email and we'll send you a reset link.</p>
        </div>

        {sent ? (
          <div className="rounded-lg bg-emerald-50 p-5 text-center">
            <p className="text-2xl">📬</p>
            <p className="mt-2 font-semibold text-emerald-800">Check your inbox</p>
            <p className="mt-1 text-sm text-emerald-700">
              If <strong>{email}</strong> is registered, a reset link has been sent. It expires in 1 hour.
            </p>
            <Link to="/login" className="mt-4 inline-block text-sm font-semibold text-[#C7511F] hover:underline">
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                <span>⚠️</span> {error}
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
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-brand-gold py-3 text-sm font-extrabold text-black transition hover:bg-yellow-400 disabled:opacity-60"
              >
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
            </form>
            <p className="mt-5 text-center text-sm text-slate-500">
              Remember your password?{' '}
              <Link to="/login" className="font-semibold text-[#C7511F] hover:underline">Sign in</Link>
            </p>
          </>
        )}
      </div>
    </section>
  );
}

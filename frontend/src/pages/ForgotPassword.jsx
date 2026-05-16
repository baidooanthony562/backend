import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { forgotPassword, resetPassword } from '../utils/api';
import { showToast } from '../components/Toast';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState('email'); // 'email' | 'code'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendCode = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      await forgotPassword(email.trim());
      setStep('code');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (code.length !== 6) { setError('Enter the 6-digit code from your email.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    setError('');
    try {
      await resetPassword({ email: email.trim(), code: code.trim(), password });
      showToast('Password reset! Please sign in.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Code is invalid or expired. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-md px-4 pb-24 pt-8 md:px-0">
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gold text-lg font-extrabold text-black">CN</span>
          <h1 className="mt-3 text-2xl font-extrabold text-slate-900">
            {step === 'email' ? 'Forgot your password?' : 'Enter your reset code'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {step === 'email'
              ? "Enter your email and we'll send you a 6-digit code."
              : `We sent a 6-digit code to ${email}. It expires in 15 minutes.`}
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>⚠️</span> {error}
          </div>
        )}

        {step === 'email' ? (
          <form onSubmit={handleSendCode} className="space-y-4">
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
              {loading ? 'Sending code...' : 'Send 6-digit code'}
            </button>
            <p className="text-center text-sm text-slate-500">
              Remember your password?{' '}
              <Link to="/login" className="font-semibold text-[#C7511F] hover:underline">Sign in</Link>
            </p>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            {/* 6-digit code */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">6-digit code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                required
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] outline-none focus:border-brand-gold focus:bg-white"
              />
            </div>

            {/* New password */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">New password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Min. 8 characters"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 pr-11 text-sm outline-none focus:border-brand-gold focus:bg-white"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Confirm new password</label>
              <input
                type={showPass ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                placeholder="Repeat password"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-gold focus:bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-brand-gold py-3 text-sm font-extrabold text-black transition hover:bg-yellow-400 disabled:opacity-60"
            >
              {loading ? 'Resetting...' : 'Reset password'}
            </button>

            <div className="flex items-center justify-between text-sm">
              <button type="button" onClick={() => { setStep('email'); setError(''); setCode(''); setPassword(''); setConfirm(''); }}
                className="text-slate-500 hover:underline">
                ← Change email
              </button>
              <button type="button" disabled={loading} onClick={handleSendCode}
                className="font-semibold text-[#C7511F] hover:underline disabled:opacity-50">
                Resend code
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

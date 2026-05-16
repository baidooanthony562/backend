import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { forgotPassword, verifyResetCode, resetPassword } from '../utils/api';
import { showToast } from '../components/Toast';
import PasswordStrength from '../components/PasswordStrength';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState('email');   // 'email' | 'code' | 'password'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1 — send code to email
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

  // Step 2 — verify code; only if valid show password fields
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (code.length !== 6) { setError('Enter the full 6-digit code.'); return; }
    setLoading(true);
    setError('');
    try {
      await verifyResetCode({ email: email.trim(), code: code.trim() });
      setStep('password');
    } catch (err) {
      setError(err.response?.data?.message || 'Code is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3 — set new password
  const handleReset = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    setError('');
    try {
      await resetPassword({ email: email.trim(), code: code.trim(), password });
      navigate('/login', { state: { resetSuccess: true, email: email.trim() } });
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    setCode('');
    try {
      await forgotPassword(email.trim());
      showToast('New code sent — check your inbox.');
    } catch {
      setError('Could not resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const stepLabel = { email: '1', code: '2', password: '3' }[step];
  const stepTitle = {
    email: 'Forgot your password?',
    code: 'Enter your code',
    password: 'Set new password',
  }[step];
  const stepSub = {
    email: "Enter your email and we'll send you a 6-digit code.",
    code: `We sent a code to ${email}. It expires in 15 minutes.`,
    password: 'Code confirmed. Choose a new password.',
  }[step];

  return (
    <section className="mx-auto max-w-md px-4 pb-24 pt-8 md:px-0">
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">

        {/* Header */}
        <div className="mb-6 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gold text-lg font-extrabold text-black">CN</span>
          <h1 className="mt-3 text-2xl font-extrabold text-slate-900">{stepTitle}</h1>
          <p className="mt-1 text-sm text-slate-500">{stepSub}</p>
        </div>

        {/* Step indicator */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {['email', 'code', 'password'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition ${
                s === step ? 'bg-brand-gold text-black' :
                ['email','code','password'].indexOf(s) < ['email','code','password'].indexOf(step)
                  ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                {['email','code','password'].indexOf(s) < ['email','code','password'].indexOf(step) ? '✓' : i + 1}
              </div>
              {i < 2 && <div className={`h-px w-8 ${['email','code','password'].indexOf(s) < ['email','code','password'].indexOf(step) ? 'bg-slate-800' : 'bg-slate-200'}`} />}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* Step 1 — email */}
        {step === 'email' && (
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
            <button type="submit" disabled={loading}
              className="w-full rounded-full bg-brand-gold py-3 text-sm font-extrabold text-black transition hover:bg-yellow-400 disabled:opacity-60">
              {loading ? 'Sending code...' : 'Send 6-digit code'}
            </button>
            <p className="text-center text-sm text-slate-500">
              Remember your password?{' '}
              <Link to="/login" className="font-semibold text-[#C7511F] hover:underline">Sign in</Link>
            </p>
          </form>
        )}

        {/* Step 2 — verify code */}
        {step === 'code' && (
          <form onSubmit={handleVerifyCode} className="space-y-4">
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
                autoFocus
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] outline-none focus:border-brand-gold focus:bg-white"
              />
            </div>
            <button type="submit" disabled={loading}
              className="w-full rounded-full bg-brand-gold py-3 text-sm font-extrabold text-black transition hover:bg-yellow-400 disabled:opacity-60">
              {loading ? 'Verifying...' : 'Verify code'}
            </button>
            <div className="flex items-center justify-between text-sm">
              <button type="button" onClick={() => { setStep('email'); setError(''); setCode(''); }}
                className="text-slate-500 hover:underline">
                ← Change email
              </button>
              <button type="button" onClick={resendCode} disabled={loading}
                className="font-semibold text-[#C7511F] hover:underline disabled:opacity-50">
                Resend code
              </button>
            </div>
          </form>
        )}

        {/* Step 3 — new password (only shown after code is confirmed) */}
        {step === 'password' && (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">New password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoFocus
                  placeholder="Min. 8 characters"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 pr-11 text-sm outline-none focus:border-brand-gold focus:bg-white"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <PasswordStrength password={password} userInfo={{ email }} />
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
            <button type="submit" disabled={loading}
              className="w-full rounded-full bg-brand-gold py-3 text-sm font-extrabold text-black transition hover:bg-yellow-400 disabled:opacity-60">
              {loading ? 'Resetting...' : 'Reset password'}
            </button>
          </form>
        )}

      </div>
    </section>
  );
}

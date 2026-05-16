import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser, verifyEmailCode, resendVerification } from '../utils/api';
import { isAuthenticated } from '../utils/auth';
import PasswordStrength from '../components/PasswordStrength';

export default function Register() {
  const navigate = useNavigate();
  useEffect(() => { if (isAuthenticated()) navigate('/'); }, [navigate]);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [done, setDone] = useState(false);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await registerUser({ name: form.name, email: form.email, password: form.password });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (code.length !== 6) { setCodeError('Enter the full 6-digit code.'); return; }
    setCodeLoading(true);
    setCodeError('');
    try {
      await verifyEmailCode({ email: form.email, code: code.trim() });
      navigate('/login', { state: { verifySuccess: true, email: form.email } });
    } catch (err) {
      setCodeError(err.response?.data?.message || 'Code is invalid or has expired. Please register again.');
    } finally {
      setCodeLoading(false);
    }
  };

  const handleResendCode = async () => {
    setCodeLoading(true);
    setCodeError('');
    try {
      await resendVerification(form.email);
      setResendDone(true);
    } catch {
      setResendDone(true);
    } finally {
      setCodeLoading(false);
    }
  };

  if (done) {
    return (
      <section className="mx-auto max-w-md px-4 pb-24 pt-8 md:px-0">
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gold text-lg font-extrabold text-black">CN</span>
            <h1 className="mt-3 text-2xl font-extrabold text-slate-900">Verify your email</h1>
            <p className="mt-1 text-sm text-slate-500">
              We sent a 6-digit code to <strong>{form.email}</strong>. It expires in 10 minutes.
            </p>
          </div>

          {codeError && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              <span>⚠️</span> {codeError}
            </div>
          )}

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
            <button type="submit" disabled={codeLoading}
              className="w-full rounded-full bg-brand-gold py-3 text-sm font-extrabold text-black transition hover:bg-yellow-400 disabled:opacity-60">
              {codeLoading ? 'Verifying...' : 'Verify & activate account'}
            </button>
          </form>

          <div className="mt-4 text-center text-sm">
            {resendDone ? (
              <p className="font-semibold text-green-700">New code sent — check your inbox.</p>
            ) : (
              <button onClick={handleResendCode} disabled={codeLoading}
                className="font-semibold text-[#C7511F] hover:underline disabled:opacity-50">
                Resend code
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-md px-4 pb-24 pt-8 md:px-0">
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gold text-lg font-extrabold text-black">CN</span>
          <h1 className="mt-3 text-2xl font-extrabold text-slate-900">Create your account</h1>
          <p className="mt-1 text-sm text-slate-500">Join Cindy Nat Enterprise and start shopping.</p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Full name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="Kwame Asante"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-gold focus:bg-white"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Email address</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="you@example.com"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-gold focus:bg-white"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Password</label>
            <div className="relative">
              <input
                name="password"
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange}
                required
                minLength={8}
                placeholder="Min. 8 characters"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 pr-11 text-sm outline-none focus:border-brand-gold focus:bg-white"
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
            <PasswordStrength password={form.password} userInfo={{ name: form.name, email: form.email }} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Confirm password</label>
            <input
              name="confirm"
              type={showPass ? 'text' : 'password'}
              value={form.confirm}
              onChange={handleChange}
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
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-[#C7511F] hover:underline">Sign in</Link>
        </p>
      </div>
    </section>
  );
}

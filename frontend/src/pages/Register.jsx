import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../utils/api';
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

  if (done) {
    return (
      <section className="mx-auto max-w-md px-4 pb-24 pt-8 md:px-0">
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
            📧
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">Check your email</h1>
          <p className="mt-3 text-slate-500">
            We sent a verification link to <strong>{form.email}</strong>.<br />
            Click the link to activate your account.
          </p>
          <p className="mt-4 text-xs text-slate-400">
            Didn't receive it? Check your spam folder or{' '}
            <Link to="/login" className="font-semibold text-[#C7511F] hover:underline">
              go to login to resend
            </Link>
            .
          </p>
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

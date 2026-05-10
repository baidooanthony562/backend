import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from '../utils/api';
import { isAdmin, saveAdminToken } from '../utils/auth';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAdmin()) {
      navigate('/admin');
    }
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const { data } = await adminLogin({ email, password });
      saveAdminToken(data.token);
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.message || 'Admin login failed');
    }
  };

  return (
    <section className="mx-auto max-w-2xl px-4 pb-24 pt-8 md:px-8">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-10 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">Admin login</h1>
        <p className="mt-3 text-slate-600">Access the secure Cindy Nat Enterprise admin dashboard.</p>
        {error && <div className="mt-6 rounded-3xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="block text-sm font-medium text-slate-700">
            Email address
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="mt-3 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-brand-gold" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="mt-3 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-brand-gold" />
          </label>
          <button type="submit" className="w-full rounded-full bg-brand-dark px-6 py-4 text-sm font-semibold text-white transition hover:bg-slate-800">Login as admin</button>
        </form>
      </div>
    </section>
  );
}

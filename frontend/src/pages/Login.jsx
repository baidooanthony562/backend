import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser } from '../utils/api';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const { data } = await loginUser({ email, password });
      localStorage.setItem('cindyNutToken', data.token);
      localStorage.setItem('cindyNutUser', JSON.stringify(data));
      window.dispatchEvent(new Event('storage'));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <section className="mx-auto max-w-2xl px-4 pb-24 pt-8 md:px-8">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-10 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">Login to your account</h1>
        <p className="mt-3 text-slate-600">Enter your email and password to access your dashboard, cart, and order history.</p>
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
          <button type="submit" className="w-full rounded-full bg-brand-dark px-6 py-4 text-sm font-semibold text-white transition hover:bg-slate-800">Login</button>
        </form>
        <div className="mt-6 flex items-center justify-between text-sm text-slate-600">
          <Link to="/register" className="text-brand-dark hover:text-brand-gold">Create an account</Link>
          <Link to="/" className="text-brand-dark hover:text-brand-gold">Forgot password?</Link>
        </div>
      </div>
    </section>
  );
}

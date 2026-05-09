import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../utils/api';

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const { data } = await registerUser(formData);
      localStorage.setItem('cindyNutToken', data.token);
      localStorage.setItem('cindyNutUser', JSON.stringify(data));
      window.dispatchEvent(new Event('storage'));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <section className="mx-auto max-w-2xl px-4 pb-24 pt-8 md:px-8">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-10 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">Create your account</h1>
        <p className="mt-3 text-slate-600">Register to save your wishlist, checkout faster, and track orders with ease.</p>
        {error && <div className="mt-6 rounded-3xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="block text-sm font-medium text-slate-700">
            Full name
            <input name="name" value={formData.name} onChange={handleChange} required className="mt-3 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-brand-gold" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Email address
            <input name="email" value={formData.email} onChange={handleChange} type="email" required className="mt-3 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-brand-gold" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input name="password" value={formData.password} onChange={handleChange} type="password" required className="mt-3 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-brand-gold" />
          </label>
          <button type="submit" className="w-full rounded-full bg-brand-gold px-6 py-4 text-sm font-semibold text-black transition hover:bg-yellow-400">Register</button>
        </form>
        <p className="mt-6 text-sm text-slate-600">
          Already have an account? <Link to="/login" className="text-brand-dark hover:text-brand-gold">Login here</Link>.
        </p>
      </div>
    </section>
  );
}

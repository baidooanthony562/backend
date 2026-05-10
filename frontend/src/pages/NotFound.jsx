import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-7xl font-extrabold text-brand-gold">404</p>
      <h1 className="mt-4 text-2xl font-extrabold text-slate-900">Page not found</h1>
      <p className="mt-2 text-slate-500">The page you're looking for doesn't exist or has been moved.</p>
      <div className="mt-6 flex gap-3">
        <Link to="/" className="rounded-full bg-brand-gold px-8 py-3 text-sm font-bold text-black hover:bg-yellow-400">
          Go Home
        </Link>
        <Link to="/shop" className="rounded-full border border-slate-200 px-8 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Browse Shop
        </Link>
      </div>
    </section>
  );
}

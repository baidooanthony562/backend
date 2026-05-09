import { Link } from 'react-router-dom';

export default function ProductCard({ product }) {
  return (
    <div className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="aspect-[4/3] overflow-hidden bg-slate-100">
        <img src={product.image} alt={product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
      </div>
      <div className="space-y-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-brand-gold px-3 py-1 text-xs font-semibold uppercase tracking-wide text-black">
            {product.category}
          </span>
          <span className="text-sm font-semibold text-brand-dark">{product.rating}★</span>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{product.name}</h3>
          <p className="mt-2 text-sm text-slate-500 line-clamp-2">{product.description}</p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xl font-semibold text-brand-dark">${product.price.toFixed(2)}</span>
          <Link to={`/product/${product.id}`} className="rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
            View
          </Link>
        </div>
      </div>
    </div>
  );
}

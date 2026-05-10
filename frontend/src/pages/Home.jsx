import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { categories } from '../data/categories';
import { fetchFeaturedProducts } from '../utils/api';
import { getProducts, onProductsChange } from '../utils/productStore';
import ProductCard from '../components/ProductCard';

const banners = [
  { bg: 'from-[#232F3E] to-[#131921]', label: "Today's Deals", title: 'Up to 15% Off Kitchen Appliances', sub: 'Limited time offers on blenders, rice cookers, pots & more', link: '/shop?sort=popular', cta: 'Shop Deals' },
  { bg: 'from-[#1a3a2a] to-[#0f2218]', label: 'New Arrivals', title: 'Fresh Stock Just Landed', sub: 'Discover the latest home appliances from Cindy Nat Enterprise', link: '/shop?sort=newest', cta: 'See New Arrivals' },
  { bg: 'from-[#3a2400] to-[#1a1000]', label: 'Best Sellers', title: 'Ghana\'s Favourite Appliances', sub: 'Top-rated products trusted by hundreds of Ghanaian homes', link: '/shop?sort=popular', cta: 'Shop Best Sellers' },
];

function useCycle(length, interval = 5000) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % length), interval);
    return () => clearInterval(id);
  }, [length, interval]);
  return [idx, setIdx];
}

function useCountdown(hours = 8) {
  const [t, setT] = useState({ h: hours, m: 0, s: 0 });
  useEffect(() => {
    const end = Date.now() + hours * 3600000;
    const id = setInterval(() => {
      const d = Math.max(0, end - Date.now());
      setT({ h: Math.floor(d / 3600000), m: Math.floor((d % 3600000) / 60000), s: Math.floor((d % 60000) / 1000) });
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

export default function Home() {
  const [featured, setFeatured] = useState(getProducts);
  const [idx, setIdx] = useCycle(banners.length);
  const { h, m, s } = useCountdown(8);

  useEffect(() => {
    fetchFeaturedProducts().then((r) => setFeatured(r.data)).catch(() => setFeatured(getProducts()));
    return onProductsChange(() => setFeatured(getProducts()));
  }, []);

  const banner = banners[idx];
  const blenders = featured.filter((p) => p.category === 'Blenders & Juicers');
  const riceCookers = featured.filter((p) => p.category === 'Rice Cookers');
  const potsAndPans = featured.filter((p) => p.category === 'Pots & Pans');
  const dispensers = featured.filter((p) => p.category === 'Water Dispensers');
  const fans = featured.filter((p) => p.category === 'Fans & Coolers');
  const foodProcessors = featured.filter((p) => p.category === 'Food Processors');

  return (
    <div className="bg-[#EAEDED] min-h-screen space-y-4 pb-10">

      {/* Hero Carousel */}
      <div className={`relative bg-gradient-to-r ${banner.bg} text-white overflow-hidden`}>
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-gold">{banner.label}</p>
          <h1 className="mt-3 max-w-2xl text-3xl font-extrabold leading-tight md:text-5xl">{banner.title}</h1>
          <p className="mt-3 max-w-xl text-slate-300">{banner.sub}</p>
          <Link to={banner.link} className="mt-6 inline-flex rounded-full bg-brand-gold px-8 py-3 text-sm font-bold text-black transition hover:bg-yellow-400">
            {banner.cta}
          </Link>
        </div>
        {/* Carousel dots */}
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {banners.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)} className={`h-2 rounded-full transition-all ${i === idx ? 'w-6 bg-brand-gold' : 'w-2 bg-white/40'}`} />
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-4 px-4 md:px-6">

        {/* Category boxes — Amazon style */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {categories.map((cat) => (
            <Link key={cat.id} to={`/shop?category=${encodeURIComponent(cat.name)}`} className="rounded-sm bg-white p-5 shadow-sm transition hover:shadow-md">
              <p className="text-2xl">{cat.icon}</p>
              <p className="mt-2 font-bold text-slate-900">{cat.name}</p>
              <p className="mt-1 text-xs text-slate-500 line-clamp-2">{cat.description}</p>
              <p className="mt-3 text-xs font-semibold text-[#C7511F] hover:underline">Shop now →</p>
            </Link>
          ))}
        </div>

        {/* Today's Deals with countdown */}
        <div className="rounded-sm bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-extrabold text-slate-900">Today's Deals</h2>
              <div className="flex items-center gap-1 text-sm">
                <span className="font-semibold text-slate-600">Ends in</span>
                {[{ v: h, l: 'h' }, { v: m, l: 'm' }, { v: s, l: 's' }].map(({ v, l }, i) => (
                  <span key={l} className="inline-flex items-center gap-0.5">
                    {i > 0 && <span className="font-bold text-red-600">:</span>}
                    <span className="rounded bg-[#131921] px-2 py-0.5 text-xs font-bold text-white">{String(v).padStart(2, '0')}{l}</span>
                  </span>
                ))}
              </div>
            </div>
            <Link to="/shop?sort=popular" className="text-sm font-semibold text-[#C7511F] hover:underline">See all deals →</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {featured.filter((p) => p.discount > 0).slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>

        {/* Blenders row */}
        {blenders.length > 0 && (
          <div className="rounded-sm bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-slate-900">🧃 Blenders & Juicers</h2>
              <Link to="/shop?category=Blenders+%26+Juicers" className="text-sm font-semibold text-[#C7511F] hover:underline">See all →</Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {blenders.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}

        {/* Rice Cookers row */}
        {riceCookers.length > 0 && (
          <div className="rounded-sm bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-slate-900">🍚 Rice Cookers</h2>
              <Link to="/shop?category=Rice+Cookers" className="text-sm font-semibold text-[#C7511F] hover:underline">See all →</Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {riceCookers.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}

        {/* Two column: Pots + Water Dispensers */}
        <div className="grid gap-4 md:grid-cols-2">
          {potsAndPans.length > 0 && (
            <div className="rounded-sm bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-slate-900">🍳 Pots & Pans</h2>
                <Link to="/shop?category=Pots+%26+Pans" className="text-xs font-semibold text-[#C7511F] hover:underline">See all →</Link>
              </div>
              <div className="grid gap-3 grid-cols-2">
                {potsAndPans.slice(0, 2).map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            </div>
          )}
          {dispensers.length > 0 && (
            <div className="rounded-sm bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-slate-900">💧 Water Dispensers</h2>
                <Link to="/shop?category=Water+Dispensers" className="text-xs font-semibold text-[#C7511F] hover:underline">See all →</Link>
              </div>
              <div className="grid gap-3 grid-cols-2">
                {dispensers.slice(0, 2).map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            </div>
          )}
        </div>

        {/* Two column: Fans + Food Processors */}
        <div className="grid gap-4 md:grid-cols-2">
          {fans.length > 0 && (
            <div className="rounded-sm bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-slate-900">💨 Fans & Coolers</h2>
                <Link to="/shop?category=Fans+%26+Coolers" className="text-xs font-semibold text-[#C7511F] hover:underline">See all →</Link>
              </div>
              <div className="grid gap-3 grid-cols-2">
                {fans.slice(0, 2).map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            </div>
          )}
          {foodProcessors.length > 0 && (
            <div className="rounded-sm bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-slate-900">⚙️ Food Processors</h2>
                <Link to="/shop?category=Food+Processors" className="text-xs font-semibold text-[#C7511F] hover:underline">See all →</Link>
              </div>
              <div className="grid gap-3 grid-cols-2">
                {foodProcessors.slice(0, 2).map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            </div>
          )}
        </div>

        {/* Sign in prompt — Amazon style */}
        <div className="rounded-sm bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">See personalised recommendations</h2>
          <Link to="/login" className="mt-4 inline-flex rounded-full bg-brand-gold px-8 py-2.5 text-sm font-bold text-black hover:bg-yellow-400">
            Sign in
          </Link>
          <p className="mt-3 text-sm text-slate-500">
            New customer? <Link to="/register" className="font-semibold text-[#C7511F] hover:underline">Start here</Link>
          </p>
        </div>

        {/* Trust bar */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[['🚚', 'Fast Delivery', 'Free on orders over ₵100'], ['↩️', 'Easy Returns', '30-day return policy'], ['🔒', 'Secure Checkout', '100% safe & encrypted'], ['📞', 'Support', '0257543723 — Kumasi']].map(([icon, title, sub]) => (
            <div key={title} className="flex items-center gap-3 rounded-sm bg-white p-4 shadow-sm">
              <span className="text-2xl">{icon}</span>
              <div>
                <p className="text-sm font-bold text-slate-900">{title}</p>
                <p className="text-xs text-slate-500">{sub}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { categories } from '../data/categories';
import { fetchFeaturedProducts } from '../utils/api';
import { getProducts } from '../utils/productStore';
import ProductCard from '../components/ProductCard';

// ── Hooks ──────────────────────────────────────────────────────────────────
function useCycle(length, interval = 5500) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % length), interval);
    return () => clearInterval(id);
  }, [length, interval]);
  return [idx, setIdx];
}

function useCountdown(hours = 6) {
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

// ── Hero slides ────────────────────────────────────────────────────────────
const SLIDES = [
  {
    badge: "Today's Special Offer",
    headline: ['Up to 15% Off', 'Kitchen Appliances'],
    sub: 'Premium blenders, rice cookers, pots & more — delivered across Kumasi.',
    cta1: { label: 'Shop Deals Now', to: '/shop?sort=popular' },
    cta2: { label: 'Browse All', to: '/shop' },
    accent: '#D4AF37',
    bg: 'linear-gradient(135deg, #0d1b2a 0%, #1a2e45 50%, #0f3d24 100%)',
  },
  {
    badge: 'New Arrivals',
    headline: ['Fresh Stock', 'Just Landed'],
    sub: 'Discover the latest from Binatone, Philips, Kenwood, Scanfrost & more.',
    cta1: { label: 'See New Arrivals', to: '/shop?sort=newest' },
    cta2: { label: 'All Categories', to: '/shop' },
    accent: '#34d399',
    bg: 'linear-gradient(135deg, #0f2218 0%, #1a3a2a 50%, #0d1b2a 100%)',
  },
  {
    badge: "Ghana's Best Sellers",
    headline: ['Trusted by Thousands', 'of Ghanaian Homes'],
    sub: 'Top-rated appliances chosen by families across Kumasi and beyond.',
    cta1: { label: 'Shop Best Sellers', to: '/shop' },
    cta2: { label: 'View Deals', to: '/shop?sort=popular' },
    accent: '#fb923c',
    bg: 'linear-gradient(135deg, #1a1000 0%, #3a2400 50%, #1a0a00 100%)',
  },
];

// ── Category colours ────────────────────────────────────────────────────────
const CAT_COLORS = {
  'Blenders & Juicers':  { from: '#fff7ed', to: '#fed7aa', icon: 'text-orange-500', border: 'border-orange-200' },
  'Rice Cookers':        { from: '#fff1f2', to: '#fecdd3', icon: 'text-rose-500',   border: 'border-rose-200' },
  'Pots & Pans':         { from: '#f8fafc', to: '#e2e8f0', icon: 'text-slate-600',  border: 'border-slate-200' },
  'Water Dispensers':    { from: '#eff6ff', to: '#bfdbfe', icon: 'text-blue-500',   border: 'border-blue-200' },
  'Irons & Steamers':    { from: '#f5f3ff', to: '#ddd6fe', icon: 'text-violet-500', border: 'border-violet-200' },
  'Toasters & Grills':   { from: '#fefce8', to: '#fef08a', icon: 'text-yellow-600', border: 'border-yellow-200' },
  'Fans & Coolers':      { from: '#ecfdf5', to: '#a7f3d0', icon: 'text-emerald-500',border: 'border-emerald-200' },
  'Food Processors':     { from: '#f0fdf4', to: '#bbf7d0', icon: 'text-green-600',  border: 'border-green-200' },
};

const BRANDS = ['Binatone', 'Philips', 'Kenwood', 'Scanfrost', 'Panasonic', 'Tefal', 'Bosch', 'Lontor'];

// ── Section wrapper ────────────────────────────────────────────────────────
function Section({ title, icon, link, linkLabel = 'See all →', children, accent = false }) {
  return (
    <div className={`rounded-xl shadow-sm overflow-hidden ${accent ? 'bg-gradient-to-br from-[#131921] to-[#232F3E]' : 'bg-white'}`}>
      <div className={`flex items-center justify-between px-5 py-4 ${accent ? 'border-b border-white/10' : 'border-b border-slate-100'}`}>
        <h2 className={`flex items-center gap-2 text-lg font-extrabold ${accent ? 'text-white' : 'text-slate-900'}`}>
          {icon && <span>{icon}</span>} {title}
        </h2>
        {link && (
          <Link to={link} className={`text-sm font-semibold hover:underline ${accent ? 'text-brand-gold' : 'text-[#C7511F]'}`}>
            {linkLabel}
          </Link>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Countdown display ──────────────────────────────────────────────────────
function Countdown({ h, m, s }) {
  const pad = (v) => String(v).padStart(2, '0');
  return (
    <div className="flex items-center gap-1.5">
      {[{ v: h, l: 'H' }, { v: m, l: 'M' }, { v: s, l: 'S' }].map(({ v, l }, i) => (
        <span key={l} className="flex items-center gap-1">
          {i > 0 && <span className="text-lg font-black text-red-400">:</span>}
          <span className="flex flex-col items-center">
            <span className="rounded-lg bg-red-600 px-3 py-1 text-xl font-black text-white tabular-nums leading-none">{pad(v)}</span>
            <span className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">{l}</span>
          </span>
        </span>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function Home() {
  const [featured, setFeatured] = useState(getProducts);
  const [slideIdx, setSlideIdx] = useCycle(SLIDES.length);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const { h, m, s } = useCountdown(6);

  useEffect(() => {
    fetchFeaturedProducts()
      .then((r) => setFeatured(Array.isArray(r.data) ? r.data : r.data?.products || []))
      .catch(() => setFeatured(getProducts()));
  }, []);

  const slide = SLIDES[slideIdx];

  const getCat = (p) => (typeof p.category === 'string' ? p.category : p.category?.name || '');

  // Derived product lists
  const deals        = featured.filter((p) => p.discount > 0).slice(0, 4);
  const bestSellers  = featured.filter((p) => p.bestseller).slice(0, 4);
  const blenders     = featured.filter((p) => getCat(p) === 'Blenders & Juicers');
  const riceCookers  = featured.filter((p) => getCat(p) === 'Rice Cookers');
  const potsAndPans  = featured.filter((p) => getCat(p) === 'Pots & Pans');
  const dispensers   = featured.filter((p) => getCat(p) === 'Water Dispensers');
  const fans         = featured.filter((p) => getCat(p) === 'Fans & Coolers');
  const processors   = featured.filter((p) => getCat(p) === 'Food Processors');

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email.trim()) { setSubscribed(true); setEmail(''); }
  };

  return (
    <div className="min-h-screen bg-[#EAEDED]">

      {/* ── HERO ── */}
      <div
        className="relative overflow-hidden text-white transition-all duration-700"
        style={{ background: slide.bg }}
      >
        {/* Background texture */}
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

        <div className="relative mx-auto max-w-7xl px-6 py-14 md:py-20 lg:py-24">
          <div className="max-w-2xl">
            <span
              className="inline-block rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest"
              style={{ backgroundColor: `${slide.accent}22`, color: slide.accent, border: `1px solid ${slide.accent}44` }}
            >
              {slide.badge}
            </span>

            <h1 className="mt-4 text-4xl font-extrabold leading-tight md:text-6xl lg:text-7xl">
              {slide.headline[0]}
              <br />
              <span style={{ color: slide.accent }}>{slide.headline[1]}</span>
            </h1>

            <p className="mt-4 max-w-lg text-base text-slate-300 md:text-lg">{slide.sub}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to={slide.cta1.to}
                className="rounded-full px-8 py-3.5 text-sm font-extrabold text-black transition hover:opacity-90 active:scale-95"
                style={{ backgroundColor: slide.accent }}
              >
                {slide.cta1.label}
              </Link>
              <Link
                to={slide.cta2.to}
                className="rounded-full border border-white/30 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10"
              >
                {slide.cta2.label}
              </Link>
            </div>
          </div>
        </div>

        {/* Slide dots */}
        <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlideIdx(i)}
              className="h-2 rounded-full transition-all duration-300"
              style={{ width: i === slideIdx ? 24 : 8, backgroundColor: i === slideIdx ? slide.accent : 'rgba(255,255,255,0.3)' }}
            />
          ))}
        </div>
      </div>

      {/* ── QUICK CATEGORY STRIP ── */}
      <div className="bg-[#232F3E] px-4 py-3">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Link to="/shop" className="shrink-0 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white whitespace-nowrap hover:bg-white/20">
            🏪 All Products
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              to={`/shop?category=${encodeURIComponent(c.name)}`}
              className="shrink-0 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white whitespace-nowrap hover:bg-white/20 transition"
            >
              {c.icon} {c.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 md:px-6">

        {/* ── TODAY'S DEALS ── */}
        {deals.length > 0 && (
          <div className="overflow-hidden rounded-xl bg-gradient-to-br from-[#131921] to-[#232F3E] shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-red-400">Flash Sale</p>
                  <h2 className="text-xl font-extrabold text-white">Today's Deals</h2>
                </div>
                <Countdown h={h} m={m} s={s} />
              </div>
              <Link to="/shop?sort=popular" className="text-sm font-semibold text-brand-gold hover:underline">
                See all deals →
              </Link>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2 md:grid-cols-4">
              {deals.map((p) => <ProductCard key={p.id || p._id} product={p} />)}
            </div>
          </div>
        )}

        {/* ── SHOP BY CATEGORY ── */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-slate-900">Shop by Category</h2>
            <Link to="/shop" className="text-sm font-semibold text-[#C7511F] hover:underline">Browse all →</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {categories.map((cat) => {
              const style = CAT_COLORS[cat.name] || CAT_COLORS['Pots & Pans'];
              return (
                <Link
                  key={cat.id}
                  to={`/shop?category=${encodeURIComponent(cat.name)}`}
                  className={`group flex flex-col items-center rounded-xl border p-4 text-center transition hover:shadow-md hover:-translate-y-0.5 ${style.border}`}
                  style={{ background: `linear-gradient(135deg, ${style.from}, ${style.to})` }}
                >
                  <span className={`text-3xl ${style.icon} transition group-hover:scale-110`}>{cat.icon}</span>
                  <p className="mt-2 text-xs font-bold leading-tight text-slate-800">{cat.name}</p>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── BEST SELLERS ── */}
        {bestSellers.length > 0 && (
          <Section title="Best Sellers" icon="🏆" link="/shop" linkLabel="See all →">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              {bestSellers.map((p) => <ProductCard key={p.id || p._id} product={p} />)}
            </div>
          </Section>
        )}

        {/* ── BLENDERS ── */}
        {blenders.length > 0 && (
          <Section title="Blenders & Juicers" icon="🧃" link="/shop?category=Blenders+%26+Juicers">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {blenders.map((p) => <ProductCard key={p.id || p._id} product={p} />)}
            </div>
          </Section>
        )}

        {/* ── RICE COOKERS ── */}
        {riceCookers.length > 0 && (
          <Section title="Rice Cookers" icon="🍚" link="/shop?category=Rice+Cookers">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {riceCookers.map((p) => <ProductCard key={p.id || p._id} product={p} />)}
            </div>
          </Section>
        )}

        {/* ── POTS + DISPENSERS (2-col) ── */}
        <div className="grid gap-5 md:grid-cols-2">
          {potsAndPans.length > 0 && (
            <Section title="Pots & Pans" icon="🍳" link="/shop?category=Pots+%26+Pans">
              <div className="grid grid-cols-2 gap-3">
                {potsAndPans.slice(0, 2).map((p) => <ProductCard key={p.id || p._id} product={p} />)}
              </div>
            </Section>
          )}
          {dispensers.length > 0 && (
            <Section title="Water Dispensers" icon="💧" link="/shop?category=Water+Dispensers">
              <div className="grid grid-cols-2 gap-3">
                {dispensers.slice(0, 2).map((p) => <ProductCard key={p.id || p._id} product={p} />)}
              </div>
            </Section>
          )}
        </div>

        {/* ── FANS + PROCESSORS (2-col) ── */}
        <div className="grid gap-5 md:grid-cols-2">
          {fans.length > 0 && (
            <Section title="Fans & Coolers" icon="💨" link="/shop?category=Fans+%26+Coolers">
              <div className="grid grid-cols-2 gap-3">
                {fans.slice(0, 2).map((p) => <ProductCard key={p.id || p._id} product={p} />)}
              </div>
            </Section>
          )}
          {processors.length > 0 && (
            <Section title="Food Processors" icon="⚙️" link="/shop?category=Food+Processors">
              <div className="grid grid-cols-2 gap-3">
                {processors.slice(0, 2).map((p) => <ProductCard key={p.id || p._id} product={p} />)}
              </div>
            </Section>
          )}
        </div>

        {/* ── BRANDS WE CARRY ── */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="mb-5 text-center text-xs font-bold uppercase tracking-widest text-slate-400">Trusted Brands We Carry</p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {BRANDS.map((b) => (
              <Link key={b} to={`/shop?search=${b}`} className="text-base font-extrabold text-slate-400 transition hover:text-slate-900">
                {b}
              </Link>
            ))}
          </div>
        </div>

        {/* ── NEWSLETTER ── */}
        <div className="overflow-hidden rounded-xl bg-gradient-to-r from-[#0f3d24] to-[#1a5c35] p-8 text-center text-white shadow-sm md:p-12">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">Stay in the loop</p>
          <h2 className="mt-2 text-2xl font-extrabold md:text-3xl">Get exclusive deals delivered to your inbox</h2>
          <p className="mt-2 text-sm text-emerald-100">Be the first to know about flash sales, new arrivals and special offers.</p>
          {subscribed ? (
            <p className="mt-6 inline-block rounded-full bg-white/20 px-8 py-3 text-sm font-bold">
              🎉 You're subscribed! Watch your inbox.
            </p>
          ) : (
            <form onSubmit={handleSubscribe} className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                className="w-full max-w-sm rounded-full border-0 px-6 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-brand-gold sm:w-80"
              />
              <button type="submit" className="rounded-full bg-brand-gold px-8 py-3 text-sm font-extrabold text-black transition hover:bg-yellow-400">
                Subscribe
              </button>
            </form>
          )}
        </div>

        {/* ── TRUST BAR ── */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { icon: '🚚', title: 'Fast Delivery', sub: 'Free on orders over ₵100' },
            { icon: '↩️', title: 'Easy Returns', sub: '30-day return policy' },
            { icon: '🔒', title: 'Secure Checkout', sub: '100% safe & encrypted' },
            { icon: '📞', title: '24/7 Support', sub: '0257543723 — Kumasi' },
          ].map(({ icon, title, sub }) => (
            <div key={title} className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl">{icon}</span>
              <div>
                <p className="text-sm font-bold text-slate-900">{title}</p>
                <p className="text-xs text-slate-500">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── SIGN IN PROMPT ── */}
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-gold">Member Exclusive</p>
          <h2 className="mt-2 text-xl font-extrabold text-slate-900">Get personalised recommendations</h2>
          <p className="mt-1 text-sm text-slate-500">Sign in to see products tailored for you and track your orders.</p>
          <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link to="/login" className="rounded-full bg-brand-gold px-8 py-3 text-sm font-extrabold text-black hover:bg-yellow-400">
              Sign in
            </Link>
            <Link to="/register" className="rounded-full border border-slate-200 px-8 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Create account
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

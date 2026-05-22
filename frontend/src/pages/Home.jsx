import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { categories } from '../data/categories';
import { fetchFeaturedProducts } from '../utils/api';
import { getProducts } from '../utils/productStore';
import ProductCard from '../components/ProductCard';

function useCycle(length, interval = 5500) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % length), interval);
    return () => clearInterval(id);
  }, [length, interval]);
  return [idx, setIdx];
}

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

const BRANDS = ['Binatone', 'Philips', 'Kenwood', 'Scanfrost', 'Panasonic', 'Tefal', 'Bosch', 'Lontor'];

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [slideIdx, setSlideIdx] = useCycle(SLIDES.length);

  useEffect(() => {
    fetchFeaturedProducts()
      .then((r) => setFeatured(Array.isArray(r.data) ? r.data : r.data?.products || []))
      .catch(() => setFeatured(getProducts()));
  }, []);

  const slide = SLIDES[slideIdx];
  const deals = featured.filter((p) => p.discount > 0).slice(0, 4);
  const bestSellers = featured.filter((p) => p.bestseller).slice(0, 4);
  const rest = featured.filter((p) => !p.bestseller && !(p.discount > 0)).slice(0, 4);

  return (
    <div className="min-h-screen bg-[#EAEDED]">

      {/* ── HERO ── */}
      <div className="relative overflow-hidden text-white transition-all duration-700" style={{ background: slide.bg }}>
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="relative mx-auto max-w-7xl px-5 py-10 md:px-6 md:py-20">
          <div className="max-w-2xl">
            <span className="inline-block rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest"
              style={{ backgroundColor: `${slide.accent}22`, color: slide.accent, border: `1px solid ${slide.accent}44` }}>
              {slide.badge}
            </span>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight sm:text-4xl md:text-6xl">
              {slide.headline[0]}<br />
              <span style={{ color: slide.accent }}>{slide.headline[1]}</span>
            </h1>
            <p className="mt-4 max-w-lg text-base text-slate-300 md:text-lg">{slide.sub}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={slide.cta1.to}
                className="rounded-full px-6 py-3 sm:px-8 sm:py-3.5 text-sm font-extrabold text-black transition hover:opacity-90"
                style={{ backgroundColor: slide.accent }}>
                {slide.cta1.label}
              </Link>
              <Link to={slide.cta2.to}
                className="rounded-full border border-white/30 px-6 py-3 sm:px-8 sm:py-3.5 text-sm font-semibold text-white transition hover:bg-white/10">
                {slide.cta2.label}
              </Link>
            </div>
          </div>
        </div>
        <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => setSlideIdx(i)}
              className="h-2 rounded-full transition-all duration-300"
              style={{ width: i === slideIdx ? 24 : 8, backgroundColor: i === slideIdx ? slide.accent : 'rgba(255,255,255,0.3)' }} />
          ))}
        </div>
      </div>

      {/* ── CATEGORY STRIP ── */}
      <div className="bg-[#232F3E] px-4 py-3">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Link to="/shop" className="shrink-0 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white whitespace-nowrap hover:bg-white/20">
            All Products
          </Link>
          {categories.map((c) => (
            <Link key={c.id} to={`/shop?category=${encodeURIComponent(c.name)}`}
              className="shrink-0 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white whitespace-nowrap hover:bg-white/20 transition">
              {c.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-4 px-4 py-4 md:px-6">


        {/* ── DEALS ── */}
        {deals.length > 0 && (
          <div className="overflow-hidden rounded-xl bg-gradient-to-br from-[#131921] to-[#232F3E] shadow-sm">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-red-400">Discounted</p>
                <h2 className="text-base font-extrabold text-white">Today's Deals</h2>
              </div>
              <Link to="/shop?sort=popular" className="text-sm font-semibold text-brand-gold hover:underline">See all →</Link>
            </div>
            <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
              {deals.map((p) => <ProductCard key={p.id || p._id} product={p} />)}
            </div>
          </div>
        )}

        {/* ── BEST SELLERS ── */}
        {bestSellers.length > 0 && (
          <div className="rounded-xl bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900"><i className="fas fa-trophy text-brand-gold"></i> Best Sellers</h2>
              <Link to="/shop" className="text-sm font-semibold text-[#C7511F] hover:underline">See all →</Link>
            </div>
            <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
              {bestSellers.map((p) => <ProductCard key={p.id || p._id} product={p} />)}
            </div>
          </div>
        )}

        {/* ── MORE PRODUCTS ── */}
        {rest.length > 0 && (
          <div className="rounded-xl bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <h2 className="text-base font-extrabold text-slate-900">New Arrivals</h2>
              <Link to="/shop?sort=newest" className="text-sm font-semibold text-[#C7511F] hover:underline">See all →</Link>
            </div>
            <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
              {rest.map((p) => <ProductCard key={p.id || p._id} product={p} />)}
            </div>
          </div>
        )}

        {/* ── TRUST BAR ── */}
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {[
            { icon: 'fas fa-truck', title: 'Fast Delivery', sub: 'Free on orders over ₵5,000' },
            { icon: 'fas fa-undo', title: 'Easy Returns', sub: '30-day return policy' },
            { icon: 'fas fa-lock', title: 'Secure Checkout', sub: '100% safe & encrypted' },
            { icon: 'fas fa-phone', title: '24/7 Support', sub: '0257543723 — Kumasi' },
          ].map(({ icon, title, sub }) => (
            <div key={title} className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100"><i className={`${icon} text-slate-600`}></i></span>
              <div>
                <p className="text-sm font-bold text-slate-900">{title}</p>
                <p className="text-xs text-slate-500">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── DIASPORA BANNER ── */}
        <div className="overflow-hidden rounded-xl bg-gradient-to-br from-[#0d1b2a] to-[#1a3a2a] shadow-sm">
          <div className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:p-8">
            <div className="flex-1 text-white">
              <span className="inline-block rounded-full border border-brand-gold/40 bg-brand-gold/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-brand-gold">
                For Ghanaians Abroad
              </span>
              <h2 className="mt-3 text-xl font-extrabold md:text-2xl">Gift Appliances to Family Back Home</h2>
              <p className="mt-2 text-sm text-slate-300">
                Based in the UK, US, Canada or Europe? Pay online and we deliver straight to your family in Ghana.
              </p>
              <ul className="mt-3 space-y-1 text-sm text-slate-300">
                <li className="flex items-center gap-2"><i className="fas fa-check text-brand-gold"></i> Pay with MoMo or international card</li>
                <li className="flex items-center gap-2"><i className="fas fa-check text-brand-gold"></i> Delivered to any address in Ghana</li>
                <li className="flex items-center gap-2"><i className="fas fa-check text-brand-gold"></i> WhatsApp updates every step of the way</li>
              </ul>
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              <Link to="/shop" className="rounded-full bg-brand-gold px-7 py-3 text-center text-sm font-extrabold text-black transition hover:bg-yellow-400">
                Shop &amp; Gift Now
              </Link>
              <a href="https://wa.me/233257543723" target="_blank" rel="noreferrer"
                className="rounded-full border border-white/30 px-7 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/10">
                <i className="fab fa-whatsapp mr-1"></i> WhatsApp Us
              </a>
            </div>
          </div>
        </div>

        {/* ── BRANDS ── */}
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="mb-4 text-center text-xs font-bold uppercase tracking-widest text-slate-400">Trusted Brands We Carry</p>
          <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2">
            {BRANDS.map((b) => (
              <Link key={b} to={`/shop?search=${b}`} className="text-sm font-extrabold text-slate-400 transition hover:text-slate-900">{b}</Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

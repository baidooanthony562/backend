import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { featuredProducts as defaultFeatured } from '../data/products';
import { categories } from '../data/categories';
import { fetchFeaturedProducts } from '../utils/api';
import CategoryCard from '../components/CategoryCard';
import ProductCard from '../components/ProductCard';
import TestimonialCard from '../components/TestimonialCard';

const testimonials = [
  { quote: 'Fast shipping and excellent appliances for every kitchen.', name: 'Amina O.', role: 'Home Chef' },
  { quote: 'Amazing products and reliable customer service.', name: 'David U.', role: 'Business Owner' },
  { quote: 'Beautiful design and top-notch performance.', name: 'Mercy N.', role: 'Interior Designer' },
];

const promos = [
  { icon: '🚚', title: 'Free Delivery', detail: 'On orders over ₵100' },
  { icon: '↩️', title: 'Easy Returns', detail: '30-day money-back guarantee' },
  { icon: '🔒', title: 'Secure Payments', detail: 'Safe & encrypted checkout' },
  { icon: '🎧', title: '24/7 Support', detail: 'Always here to help you' },
];

function useCountdown(targetHours = 8) {
  const [timeLeft, setTimeLeft] = useState({ h: targetHours, m: 0, s: 0 });
  useEffect(() => {
    const end = Date.now() + targetHours * 3600 * 1000;
    const tick = () => {
      const diff = Math.max(0, end - Date.now());
      setTimeLeft({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return timeLeft;
}

function CountdownBox({ value, label }) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-brand-dark px-3 py-1 text-white">
      <span className="text-xl font-bold leading-none">{String(value).padStart(2, '0')}</span>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  );
}

export default function Home() {
  const [featured, setFeatured] = useState(defaultFeatured);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { h, m, s } = useCountdown(8);

  useEffect(() => {
    fetchFeaturedProducts()
      .then((res) => setFeatured(res.data))
      .catch(() => setFeatured(defaultFeatured));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) navigate(`/shop?search=${encodeURIComponent(search.trim())}`);
  };

  return (
    <div className="space-y-10">

      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-brand-dark text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(212,175,55,0.4),_transparent_50%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-24">
          <div className="max-w-2xl space-y-6">
            <span className="inline-flex rounded-full bg-brand-gold px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-black">
              Premium Kitchen Essentials
            </span>
            <h1 className="text-4xl font-extrabold leading-tight md:text-6xl">
              Shop the Best Home Appliances in Ghana
            </h1>
            <p className="text-lg text-slate-300">
              Cindy Nat Enterprise — quality blenders, rice cookers, cookware and electronics delivered fast.
            </p>
            <form onSubmit={handleSearch} className="flex max-w-xl overflow-hidden rounded-full bg-white shadow-lg">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search for blenders, rice cookers..."
                className="flex-1 px-6 py-4 text-sm text-slate-900 outline-none"
              />
              <button type="submit" className="bg-brand-gold px-6 text-sm font-bold text-black transition hover:bg-yellow-400">
                Search
              </button>
            </form>
            <div className="flex flex-wrap gap-3">
              <Link to="/shop" className="rounded-full bg-brand-gold px-7 py-3 text-sm font-bold text-black transition hover:bg-yellow-400">
                Shop Now
              </Link>
              <Link to="/shop?sort=popular" className="rounded-full border border-white/30 px-7 py-3 text-sm text-white transition hover:border-brand-gold hover:text-brand-gold">
                View Deals
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Promo strips */}
      <section className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {promos.map((item) => (
            <div key={item.title} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-3xl">{item.icon}</span>
              <div>
                <p className="font-semibold text-slate-900">{item.title}</p>
                <p className="text-sm text-slate-500">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Flash Deals */}
      <section className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6">
          <div className="mb-6 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              <h2 className="text-2xl font-extrabold text-red-600">Flash Deals</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-600">Ends in:</span>
              <div className="flex items-center gap-1">
                <CountdownBox value={h} label="HRS" />
                <span className="font-bold text-slate-600">:</span>
                <CountdownBox value={m} label="MIN" />
                <span className="font-bold text-slate-600">:</span>
                <CountdownBox value={s} label="SEC" />
              </div>
            </div>
            <Link to="/shop?sort=popular" className="ml-auto text-sm font-semibold text-red-600 hover:underline">
              See All →
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.slice(0, 4).map((product) => (
              <ProductCard key={product._id || product.id} product={{ ...product, discount: product.discount || 10 }} />
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-gold">Browse</p>
            <h2 className="mt-1 text-2xl font-extrabold text-slate-900">Shop by Category</h2>
          </div>
          <Link to="/shop" className="text-sm font-semibold text-brand-dark hover:text-brand-gold">View all →</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      </section>

      {/* Best Sellers */}
      <section className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-gold">Top Picks</p>
            <h2 className="mt-1 text-2xl font-extrabold text-slate-900">Best Selling Appliances</h2>
          </div>
          <Link to="/shop" className="text-sm font-semibold text-brand-dark hover:text-brand-gold">View all →</Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {featured.map((product) => (
            <ProductCard key={product._id || product.id} product={product} />
          ))}
        </div>
      </section>

      {/* About Banner */}
      <section className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="rounded-2xl bg-brand-dark px-8 py-10 text-white md:px-14">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-3xl font-extrabold">About Cindy Nat Enterprise</h2>
              <p className="mt-4 leading-8 text-slate-300">
                Your trusted home appliance store in Ghana. We stock premium blenders, rice cookers, cookware, drink dispensers and more — selected for modern Ghanaian homes.
              </p>
              <Link to="/shop" className="mt-6 inline-flex rounded-full bg-brand-gold px-6 py-3 text-sm font-bold text-black transition hover:bg-yellow-400">
                Shop Now
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[['500+', 'Happy Customers'], ['50+', 'Products'], ['Fast', 'Delivery'], ['24/7', 'Support']].map(([val, label]) => (
                <div key={label} className="rounded-2xl bg-white/10 p-5 text-center">
                  <p className="text-2xl font-extrabold text-brand-gold">{val}</p>
                  <p className="mt-1 text-sm text-slate-300">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-gold">Reviews</p>
          <h2 className="mt-1 text-2xl font-extrabold text-slate-900">What Our Customers Say</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {testimonials.map((item) => (
            <TestimonialCard key={item.name} quote={item.quote} name={item.name} role={item.role} />
          ))}
        </div>
      </section>

      {/* Contact CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-10 md:px-8">
        <div className="rounded-2xl bg-brand-green px-8 py-10 text-white md:px-14">
          <h2 className="text-2xl font-extrabold">Need help choosing the right appliance?</h2>
          <p className="mt-3 text-slate-200">Our experts are ready to help you find the perfect product for your home.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="mailto:support@cindynat.com" className="rounded-full bg-white px-6 py-3 text-sm font-bold text-brand-dark transition hover:bg-slate-100">
              Email Us
            </a>
            <a href="https://wa.me/233800123456" target="_blank" rel="noreferrer" className="rounded-full border border-white px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10">
              WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { featuredProducts as defaultFeatured } from '../data/products';
import { categories } from '../data/categories';
import { fetchFeaturedProducts } from '../utils/api';
import CategoryCard from '../components/CategoryCard';
import ProductCard from '../components/ProductCard';
import TestimonialCard from '../components/TestimonialCard';

const promos = [
  { title: 'Free delivery', detail: 'On orders over $100' },
  { title: 'Easy returns', detail: '30-day money-back guarantee' },
  { title: 'Secure payments', detail: 'Stripe and Paystack ready' },
];

const testimonials = [
  { quote: 'Fast shipping and excellent appliances for every kitchen.', name: 'Amina O.', role: 'Home Chef' },
  { quote: 'Amazing products and reliable customer service.', name: 'David U.', role: 'Business Owner' },
  { quote: 'Beautiful design and top-notch performance.', name: 'Mercy N.', role: 'Interior Designer' },
];

export default function Home() {
  const [featured, setFeatured] = useState(defaultFeatured);

  useEffect(() => {
    fetchFeaturedProducts()
      .then((response) => setFeatured(response.data))
      .catch(() => setFeatured(defaultFeatured));
  }, []);

  return (
    <div className="space-y-24">
      <section className="relative overflow-hidden bg-brand-dark text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(212,175,55,0.35),_transparent_40%)]"></div>
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-24 md:grid-cols-2 md:px-8">
          <div className="relative z-10 space-y-8">
            <span className="inline-flex rounded-full bg-brand-gold px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-black">
              Premium Kitchen Essentials
            </span>
            <div className="space-y-6">
              <h1 className="max-w-2xl text-5xl font-bold leading-tight md:text-6xl">
                Modern home appliances for every cook and every home.
              </h1>
              <p className="max-w-xl text-lg text-slate-200">
                Cindy Nat Enterprise delivers quality blenders, rice cookers, cookware, and electronics with trusted support and fast delivery.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link to="/shop" className="inline-flex items-center justify-center rounded-full bg-brand-gold px-7 py-4 text-base font-semibold text-black shadow-lg shadow-brand-gold/30 transition hover:bg-yellow-400">
                Shop now
              </Link>
              <a href="#offers" className="inline-flex items-center justify-center rounded-full border border-white/30 px-7 py-4 text-base text-white transition hover:border-brand-gold hover:text-brand-gold">
                Explore offers
              </a>
            </div>
          </div>
          <div className="relative z-10 overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-950/80 p-6 shadow-soft">
            <div className="grid gap-4 sm:grid-cols-2">
              {featured.map((product) => (
                <div key={product._id || product.id} className="rounded-3xl bg-slate-900 p-4 shadow-xl">
                  <img src={product.images?.[0] || product.image} alt={product.name} className="h-44 w-full rounded-3xl object-cover" />
                  <h3 className="mt-4 text-lg font-semibold text-white">{product.name}</h3>
                  <p className="mt-2 text-sm text-slate-300">{product.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="offers" className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {promos.map((item) => (
            <div key={item.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-brand-dark">{item.title}</h3>
              <p className="mt-3 text-slate-600">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="about" className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-brand-gold">Explore categories</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">Shop by collection</h2>
          </div>
          <Link to="/shop" className="text-sm font-semibold text-brand-dark transition hover:text-brand-gold">
            Browse all categories â†’
          </Link>
        </div>
        <div className="grid gap-5 md:grid-cols-4">
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="rounded-[2rem] bg-slate-950 px-10 py-12 text-white shadow-soft">
          <h2 className="text-3xl font-bold">About Cindy Nat Enterprise</h2>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-200">
            Cindy Nat Enterprise offers premium kitchen appliances and household electronics with a focus on quality, trust, and exceptional customer service. From blenders to rice cookers and drink dispensers, every product is selected for modern homes.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="mb-10">
          <p className="text-sm uppercase tracking-[0.3em] text-brand-gold">Best sellers</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">Most-loved appliances</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="mb-10">
          <p className="text-sm uppercase tracking-[0.3em] text-brand-gold">Customer stories</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">Trusted by happy households</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((item) => (
            <TestimonialCard key={item.name} quote={item.quote} name={item.name} role={item.role} />
          ))}
        </div>
      </section>

      <section id="contact" className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="rounded-[2rem] bg-brand-green px-8 py-12 text-white shadow-soft md:px-14">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold">Need help choosing the perfect appliance?</h2>
            <p className="mt-4 text-lg leading-8 text-slate-100">
              Our kitchen experts are ready to support your order and answer questions about products, delivery, and warranties.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <a href="mailto:support@cindynut.com" className="rounded-full bg-white px-6 py-4 text-sm font-semibold text-brand-dark shadow-lg transition hover:bg-slate-100">
                Email support
              </a>
              <a href="https://wa.me/2348001234567" target="_blank" rel="noreferrer" className="rounded-full border border-white px-6 py-4 text-sm font-semibold text-white transition hover:bg-white/10">
                WhatsApp order
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

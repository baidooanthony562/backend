import { useMemo, useState } from 'react';
import ProductCard from '../components/ProductCard';
import { featuredProducts } from '../data/products';
import { categories } from '../data/categories';

const sortOptions = [
  { label: 'Newest', value: 'newest' },
  { label: 'Cheapest', value: 'cheapest' },
  { label: 'Popular', value: 'popular' },
];

export default function Shop() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [priceRange, setPriceRange] = useState('all');
  const [sort, setSort] = useState('newest');

  const filteredProducts = useMemo(() => {
    return featuredProducts
      .filter((product) => product.name.toLowerCase().includes(search.toLowerCase()))
      .filter((product) => (selectedCategory === 'All' ? true : product.category === selectedCategory))
      .filter((product) => {
        if (priceRange === 'under50') return product.price < 50;
        if (priceRange === '50-100') return product.price >= 50 && product.price <= 100;
        if (priceRange === 'over100') return product.price > 100;
        return true;
      })
      .sort((a, b) => {
        if (sort === 'cheapest') return a.price - b.price;
        if (sort === 'popular') return b.rating - a.rating;
        return 0;
      });
  }, [search, selectedCategory, priceRange, sort]);

  return (
    <section className="mx-auto max-w-7xl px-4 pb-24 md:px-8">
      <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-brand-gold">Shop</p>
          <h1 className="mt-3 text-4xl font-bold text-slate-900">Kitchen appliances & home essentials</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Search products</h2>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Enter a product name"
              className="mt-4 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-brand-gold"
            />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Categories</h2>
            <div className="mt-4 space-y-3">
              <button className={`w-full rounded-3xl px-4 py-3 text-left text-sm ${selectedCategory === 'All' ? 'bg-brand-dark text-white' : 'bg-slate-50 text-slate-700'}`} onClick={() => setSelectedCategory('All')}>
                All
              </button>
              {categories.map((category) => (
                <button key={category.id} className={`w-full rounded-3xl px-4 py-3 text-left text-sm ${selectedCategory === category.name ? 'bg-brand-dark text-white' : 'bg-slate-50 text-slate-700'}`} onClick={() => setSelectedCategory(category.name)}>
                  {category.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Price range</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <button className={`w-full rounded-3xl px-4 py-3 text-left ${priceRange === 'all' ? 'bg-brand-dark text-white' : 'bg-slate-50'}`} onClick={() => setPriceRange('all')}>All Prices</button>
              <button className={`w-full rounded-3xl px-4 py-3 text-left ${priceRange === 'under50' ? 'bg-brand-dark text-white' : 'bg-slate-50'}`} onClick={() => setPriceRange('under50')}>Under $50</button>
              <button className={`w-full rounded-3xl px-4 py-3 text-left ${priceRange === '50-100' ? 'bg-brand-dark text-white' : 'bg-slate-50'}`} onClick={() => setPriceRange('50-100')}>₵50 - $100</button>
              <button className={`w-full rounded-3xl px-4 py-3 text-left ${priceRange === 'over100' ? 'bg-brand-dark text-white' : 'bg-slate-50'}`} onClick={() => setPriceRange('over100')}>Above $100</button>
            </div>
          </div>
        </aside>

        <div className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          {filteredProducts.length === 0 && <p className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-600">No products match your filter. Try a different keyword or category.</p>}
        </div>
      </div>
    </section>
  );
}

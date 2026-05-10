import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { categories } from '../data/categories';
import { getProducts, onProductsChange } from '../utils/productStore';

const sortOptions = [
  { label: 'Newest First', value: 'newest' },
  { label: 'Price: Low to High', value: 'cheapest' },
  { label: 'Price: High to Low', value: 'expensive' },
  { label: 'Most Popular', value: 'popular' },
  { label: 'Biggest Discount', value: 'discount' },
];

const priceOptions = [
  { label: 'All Prices', value: 'all' },
  { label: 'Under ₵200', value: 'under200' },
  { label: '₵200 – ₵400', value: '200-400' },
  { label: '₵400 – ₵600', value: '400-600' },
  { label: 'Above ₵600', value: 'over600' },
];

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'All');
  const [priceRange, setPriceRange] = useState('all');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [allProducts, setAllProducts] = useState(getProducts);

  useEffect(() => {
    const cat = searchParams.get('category');
    const q = searchParams.get('search');
    const s = searchParams.get('sort');
    if (cat) setSelectedCategory(cat);
    if (q) setSearch(q);
    if (s) setSort(s);
  }, [searchParams]);

  useEffect(() => {
    return onProductsChange(() => setAllProducts(getProducts()));
  }, []);

  const pageTitle = selectedCategory !== 'All'
    ? selectedCategory
    : search
    ? `Results for "${search}"`
    : 'All Products';

  const filteredProducts = useMemo(() => {
    return allProducts
      .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
      .filter((p) => {
        if (selectedCategory === 'All') return true;
        const cat = typeof p.category === 'string' ? p.category : p.category?.name || '';
        return cat.toLowerCase() === selectedCategory.toLowerCase();
      })
      .filter((p) => {
        if (priceRange === 'under200') return p.price < 200;
        if (priceRange === '200-400') return p.price >= 200 && p.price <= 400;
        if (priceRange === '400-600') return p.price > 400 && p.price <= 600;
        if (priceRange === 'over600') return p.price > 600;
        return true;
      })
      .sort((a, b) => {
        if (sort === 'cheapest')   return a.price - b.price;
        if (sort === 'expensive')  return b.price - a.price;
        if (sort === 'popular')    return (b.rating || 0) - (a.rating || 0);
        if (sort === 'discount')   return (b.discount || 0) - (a.discount || 0);
        return 0;
      });
  }, [search, selectedCategory, priceRange, sort, allProducts]);

  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat);
    setSearchParams(cat === 'All' ? {} : { category: cat });
  };

  return (
    <section className="mx-auto max-w-7xl px-4 pb-24 pt-4 md:px-8">
      {/* Page Header */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-brand-gold">
            {selectedCategory !== 'All' ? 'Category' : 'Shop'}
          </p>
          <h1 className="mt-1 text-3xl font-extrabold text-slate-900">{pageTitle}</h1>
          <p className="mt-1 text-sm text-slate-500">{filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found</p>
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="w-fit rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm text-slate-700 shadow-sm"
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <aside className="space-y-6 self-start rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {/* Search */}
          <div>
            <h3 className="mb-3 font-bold text-slate-900">Search</h3>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Product name..."
              className="w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand-gold"
            />
          </div>

          {/* Categories */}
          <div>
            <h3 className="mb-3 font-bold text-slate-900">Categories</h3>
            <div className="space-y-2">
              <button
                onClick={() => handleCategorySelect('All')}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm transition ${selectedCategory === 'All' ? 'bg-brand-dark font-semibold text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
              >
                <span>🏪</span> All Products
              </button>
              {categories.map((cat) => {
                const count = allProducts.filter((p) => {
                  const c = typeof p.category === 'string' ? p.category : p.category?.name || '';
                  return c.toLowerCase() === cat.name.toLowerCase();
                }).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategorySelect(cat.name)}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm transition ${selectedCategory === cat.name ? 'bg-brand-dark font-semibold text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                  >
                    <span>{cat.icon}</span>
                    <span className="flex-1">{cat.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${selectedCategory === cat.name ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price */}
          <div>
            <h3 className="mb-3 font-bold text-slate-900">Price Range</h3>
            <div className="space-y-2">
              {priceOptions.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setPriceRange(o.value)}
                  className={`w-full rounded-xl px-4 py-2.5 text-left text-sm transition ${priceRange === o.value ? 'bg-brand-dark font-semibold text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Product Grid */}
        <div>
          {filteredProducts.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <p className="text-4xl">🔍</p>
              <p className="mt-4 text-lg font-semibold text-slate-700">No products found</p>
              <p className="mt-2 text-sm text-slate-500">Try a different category or keyword.</p>
              <button onClick={() => handleCategorySelect('All')} className="mt-5 rounded-full bg-brand-dark px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
                View All Products
              </button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id || product._id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

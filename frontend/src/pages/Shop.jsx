import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { categories } from '../data/categories';
import { fetchProducts } from '../utils/api';
import { getProducts, saveProducts } from '../utils/productStore';

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
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 12;

  useEffect(() => {
    const cat = searchParams.get('category');
    const q = searchParams.get('search');
    const s = searchParams.get('sort');
    if (cat) setSelectedCategory(cat);
    if (q) setSearch(q);
    if (s) setSort(s);
  }, [searchParams]);

  useEffect(() => {
    fetchProducts()
      .then(({ data }) => {
        const products = Array.isArray(data) ? data : data.products || [];
        setAllProducts(products);
        saveProducts(products);
      })
      .catch(() => setAllProducts(getProducts()))
      .finally(() => setLoading(false));
  }, []);

  const pageTitle = selectedCategory !== 'All'
    ? selectedCategory
    : search
    ? `Results for "${search}"`
    : 'All Products';

  // Reset to page 1 whenever filters change
  useEffect(() => { setCurrentPage(1); }, [search, selectedCategory, priceRange, sort]);

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

  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const productsRef = useRef(null);

  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat);
    setSearchParams(cat === 'All' ? {} : { category: cat });
    // On mobile scroll straight to products
    if (window.innerWidth < 1024) {
      setTimeout(() => productsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
  };

  const handlePriceSelect = (val) => {
    setPriceRange(val);
    if (window.innerWidth < 1024) {
      setTimeout(() => productsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
  };

  return (
    <section className="mx-auto max-w-7xl px-4 pb-24 pt-4 md:px-8">

      {/* ── MOBILE FILTERS (hidden on lg+) ── */}
      <div className="lg:hidden">
        {/* Horizontal category pills */}
        <div className="mb-3 -mx-4 px-4 overflow-x-auto">
          <div className="flex gap-2 pb-2" style={{ width: 'max-content' }}>
            <button
              onClick={() => handleCategorySelect('All')}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${selectedCategory === 'All' ? 'bg-brand-dark text-white' : 'bg-white border border-slate-200 text-slate-700'}`}
            >
              <i className="fas fa-store"></i> All
            </button>
            {categories.map((cat) => {
              const count = allProducts.filter((p) => {
                const c = typeof p.category === 'string' ? p.category : p.category?.name || '';
                return c.toLowerCase() === cat.name.toLowerCase();
              }).length;
              const active = selectedCategory === cat.name;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.name)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${active ? 'bg-brand-dark text-white' : 'bg-white border border-slate-200 text-slate-700'}`}
                >
                  <i className={cat.icon}></i>
                  <span>{cat.name}</span>
                  {count > 0 && <span className={`rounded-full px-1.5 text-xs ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{count}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter + sort bar */}
        <div className="mb-4 flex gap-2">
          <select
            value={priceRange}
            onChange={(e) => handlePriceSelect(e.target.value)}
            className="flex-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
          >
            {priceOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="flex-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
          >
            {sortOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Result count */}
        <p className="mb-3 text-sm text-slate-500">
          <span className="font-semibold text-slate-800">{filteredProducts.length}</span> product{filteredProducts.length !== 1 ? 's' : ''}
          {selectedCategory !== 'All' && <span> in <span className="font-semibold text-brand-gold">{selectedCategory}</span></span>}
        </p>
      </div>

      {/* ── PAGE HEADER (desktop only) ── */}
      <div className="hidden lg:mb-6 lg:flex lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-brand-gold">
            {selectedCategory !== 'All' ? 'Category' : 'Shop'}
          </p>
          <h1 className="mt-1 text-3xl font-extrabold text-slate-900">{pageTitle}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
            {totalPages > 1 && ` — page ${currentPage} of ${totalPages}`}
          </p>
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
        {/* Sidebar — desktop only */}
        <aside className="hidden lg:block space-y-6 self-start rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
                <i className="fas fa-store"></i> All Products
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
                    <i className={cat.icon}></i>
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
        <div ref={productsRef}>
          {loading ? (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded border border-slate-200 bg-white overflow-hidden">
                  <div className="aspect-square bg-slate-200" />
                  <div className="p-2 space-y-1.5">
                    <div className="h-3 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                    <div className="h-7 bg-slate-200 rounded-full mt-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <i className="fas fa-search text-4xl text-slate-300"></i>
              <p className="mt-4 text-lg font-semibold text-slate-700">No products found</p>
              <p className="mt-2 text-sm text-slate-500">Try a different category or keyword.</p>
              <button onClick={() => handleCategorySelect('All')} className="mt-5 rounded-full bg-brand-dark px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
                View All Products
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
                {paginatedProducts.map((product) => (
                  <ProductCard key={product.id || product._id} product={product} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <button
                    onClick={() => { setCurrentPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    disabled={currentPage === 1}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    ← Prev
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .reduce((acc, p, idx, arr) => {
                      if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === '...' ? (
                        <span key={`ellipsis-${i}`} className="px-2 text-slate-400">…</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => { setCurrentPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                          className={`h-9 w-9 rounded-full text-sm font-semibold transition ${p === currentPage ? 'bg-brand-dark text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                        >
                          {p}
                        </button>
                      )
                    )}

                  <button
                    onClick={() => { setCurrentPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    disabled={currentPage === totalPages}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

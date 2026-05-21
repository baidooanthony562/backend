import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getAuthUser, isAuthenticated, isAdmin, logout } from '../utils/auth';

export default function NavBar() {
  const [open, setOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');
  const [searchCat, setSearchCat] = useState('');
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();

  const updateAuth = () => {
    setAuthenticated(isAuthenticated());
    setAdminMode(isAdmin());
    setUser(getAuthUser());
  };

  const updateCart = () => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCartCount(cart.reduce((sum, i) => sum + i.quantity, 0));
  };

  useEffect(() => {
    updateAuth();
    updateCart();
    window.addEventListener('storage', updateAuth);
    window.addEventListener('storage', updateCart);
    return () => {
      window.removeEventListener('storage', updateAuth);
      window.removeEventListener('storage', updateCart);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setAuthenticated(false);
    setAdminMode(false);
    setUser(null);
    navigate('/');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (searchCat) params.set('category', searchCat);
    if (params.toString()) {
      navigate(`/shop?${params.toString()}`);
      setSearch('');
    }
  };

  return (
    <header className="fixed inset-x-0 top-0 z-40">
      {/* Main bar */}
      <div className="bg-[#131921] px-4 py-2 md:px-6">
        <div className="mx-auto flex max-w-7xl items-center gap-3">

          {/* Logo */}
          <Link to="/" className="flex shrink-0 items-center gap-1.5 rounded border-2 border-transparent px-1 py-1 hover:border-white">
            <span className="flex h-8 w-8 items-center justify-center rounded bg-brand-gold text-xs font-extrabold text-black">CN</span>
            <div className="hidden sm:block">
              <p className="text-sm font-bold leading-none text-white">Cindy Nat</p>
              <p className="text-xs leading-none text-slate-400">Enterprise</p>
            </div>
          </Link>

          {/* Deliver to */}
          <Link to="/dashboard" className="hidden shrink-0 items-center gap-1 rounded border-2 border-transparent px-1 hover:border-white lg:flex">
            <span className="text-lg">📍</span>
            <div>
              <p className="text-xs text-slate-400">Deliver to</p>
              <p className="text-sm font-bold text-white">Kumasi, GH</p>
            </div>
          </Link>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex flex-1 overflow-hidden rounded-lg">
            <select value={searchCat} onChange={(e) => setSearchCat(e.target.value)} className="hidden sm:block shrink-0 border-r border-slate-300 bg-slate-200 px-3 py-2 text-xs text-slate-700 outline-none">
              <option value="">All</option>
              <option>Blenders & Juicers</option>
              <option>Rice Cookers</option>
              <option>Pots & Pans</option>
              <option>Water Dispensers</option>
              <option>Irons & Steamers</option>
              <option>Toasters & Grills</option>
              <option>Fans & Coolers</option>
              <option>Food Processors</option>
            </select>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="min-w-0 flex-1 px-3 py-2 text-sm text-slate-900 outline-none sm:px-4"
            />
            <button type="submit" className="flex shrink-0 items-center bg-brand-gold px-3 text-slate-900 transition hover:bg-yellow-400 sm:px-4">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
              </svg>
            </button>
          </form>

          {/* Account */}
          <div className="group relative hidden shrink-0 cursor-pointer rounded border-2 border-transparent px-2 py-1 hover:border-white md:block">
            <p className="text-xs text-slate-400">{authenticated ? `Hello, ${user?.name?.split(' ')[0] || 'User'}` : 'Hello, sign in'}</p>
            <p className="text-sm font-bold text-white">Account & Lists</p>
            <div className="absolute right-0 top-full hidden min-w-[180px] rounded-lg border border-slate-200 bg-white py-2 shadow-xl group-hover:block">
              {authenticated ? (
                <>
                  <Link to="/dashboard" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">My Account</Link>
                  <Link to="/orders" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">My Orders</Link>
                  {adminMode && <Link to="/admin" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Admin Panel</Link>}
                  <button onClick={handleLogout} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">Sign Out</button>
                </>
              ) : (
                <>
                  <Link to="/login" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Sign In</Link>
                  <Link to="/register" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Create Account</Link>
                </>
              )}
            </div>
          </div>

          {/* Orders */}
          <Link to="/orders" className="hidden shrink-0 items-center rounded border-2 border-transparent px-2 py-1 hover:border-white md:block">
            <p className="text-xs text-slate-400">Returns</p>
            <p className="text-sm font-bold text-white">& Orders</p>
          </Link>

          {/* Cart */}
          <Link to="/cart" className="relative flex shrink-0 items-center gap-1 rounded border-2 border-transparent px-2 py-1 hover:border-white">
            <div className="relative">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="absolute -top-1 left-4 min-w-[20px] rounded-full bg-brand-gold px-1 text-center text-xs font-extrabold text-black">
                {cartCount}
              </span>
            </div>
            <span className="hidden text-sm font-bold text-white sm:block">Cart</span>
          </Link>

          {/* Mobile: quick account link */}
          <Link to={authenticated ? '/dashboard' : '/login'} className="shrink-0 rounded border-2 border-transparent p-1 text-white hover:border-white md:hidden">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </Link>

          {/* Mobile menu toggle */}
          <button onClick={() => setOpen(!open)} className="shrink-0 rounded border-2 border-transparent p-1 text-white hover:border-white md:hidden">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={open ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
            </svg>
          </button>
        </div>
      </div>

      {/* Secondary nav */}
      <div className="hidden bg-[#232F3E] px-4 md:block md:px-6">
        <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto py-1.5">
          <Link to="/shop" className="flex shrink-0 items-center gap-1 rounded border-2 border-transparent px-3 py-1 text-sm font-semibold text-white hover:border-white">
            ☰ All
          </Link>
          {[
            ['Blenders & Juicers', 'Blenders & Juicers'],
            ['Rice Cookers', 'Rice Cookers'],
            ['Pots & Pans', 'Pots & Pans'],
            ['Water Dispensers', 'Water Dispensers'],
            ['Irons & Steamers', 'Irons & Steamers'],
            ['Toasters & Grills', 'Toasters & Grills'],
            ['Fans & Coolers', 'Fans & Coolers'],
            ['Food Processors', 'Food Processors'],
          ].map(([label, cat]) => (
            <Link key={cat} to={`/shop?category=${encodeURIComponent(cat)}`} className="shrink-0 rounded border-2 border-transparent px-3 py-1 text-sm text-white hover:border-white">
              {label}
            </Link>
          ))}
          <Link to="/shop?sort=popular" className="shrink-0 rounded border-2 border-transparent px-3 py-1 text-sm font-semibold text-brand-gold hover:border-white">
            🔥 Today's Deals
          </Link>
          <Link to="/shop?sort=newest" className="shrink-0 rounded border-2 border-transparent px-3 py-1 text-sm text-white hover:border-white">
            New Arrivals
          </Link>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-slate-700 bg-[#131921] px-4 py-4 md:hidden">
          <form onSubmit={handleSearch} className="mb-4 flex overflow-hidden rounded-lg">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="flex-1 px-4 py-2 text-sm outline-none" />
            <button type="submit" className="bg-brand-gold px-4 text-sm font-bold">Go</button>
          </form>
          <div className="space-y-1">
            {[
              ['Home', '/'],
              ['Shop All', '/shop'],
              ['Blenders & Juicers', '/shop?category=Blenders+%26+Juicers'],
              ['Rice Cookers', '/shop?category=Rice+Cookers'],
              ['Pots & Pans', '/shop?category=Pots+%26+Pans'],
              ['Water Dispensers', '/shop?category=Water+Dispensers'],
              ['Irons & Steamers', '/shop?category=Irons+%26+Steamers'],
              ['Toasters & Grills', '/shop?category=Toasters+%26+Grills'],
              ['Fans & Coolers', '/shop?category=Fans+%26+Coolers'],
              ['Food Processors', '/shop?category=Food+Processors'],
              ['Cart', '/cart'],
              ['My Orders', '/orders'],
            ].map(([label, path]) => (
              <Link key={label} to={path} onClick={() => setOpen(false)} className="block rounded px-3 py-2 text-sm text-white hover:bg-white/10">{label}</Link>
            ))}
            {authenticated ? (
              <>
                <Link to="/dashboard" onClick={() => setOpen(false)} className="block rounded px-3 py-2 text-sm text-white hover:bg-white/10">My Account</Link>
                <button onClick={() => { handleLogout(); setOpen(false); }} className="w-full rounded px-3 py-2 text-left text-sm text-white hover:bg-white/10">Sign Out</button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setOpen(false)} className="block rounded px-3 py-2 text-sm text-white hover:bg-white/10">Sign In</Link>
                <Link to="/register" onClick={() => setOpen(false)} className="block rounded px-3 py-2 text-sm text-white hover:bg-white/10">Create Account</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

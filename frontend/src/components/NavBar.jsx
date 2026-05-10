import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getAuthUser, isAuthenticated, isAdmin, logout } from '../utils/auth';

export default function NavBar() {
  const [open, setOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();

  const updateAuth = () => {
    setAuthenticated(isAuthenticated());
    setAdminMode(isAdmin());
    setUser(getAuthUser());
  };

  const updateCart = () => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCartCount(cart.reduce((sum, item) => sum + item.quantity, 0));
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
    if (search.trim()) {
      navigate(`/shop?search=${encodeURIComponent(search.trim())}`);
      setSearch('');
    }
  };

  return (
    <header className="fixed inset-x-0 top-0 z-40 shadow-md">
      {/* Top bar */}
      <div className="bg-brand-dark px-4 py-2 md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <span className="text-xs text-slate-300">Free delivery on orders over ₵100</span>
          <div className="flex items-center gap-4 text-xs text-slate-300">
            {adminMode && (
              <Link to="/admin" className="hover:text-brand-gold">Admin Panel</Link>
            )}
            {authenticated ? (
              <>
                <Link to="/dashboard" className="hover:text-brand-gold">My Account</Link>
                <button onClick={handleLogout} className="hover:text-brand-gold">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="hover:text-brand-gold">Login</Link>
                <Link to="/register" className="hover:text-brand-gold">Register</Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main navbar */}
      <div className="bg-brand-gold px-4 py-3 md:px-8">
        <div className="mx-auto flex max-w-7xl items-center gap-4">
          {/* Logo */}
          <Link to="/" className="flex shrink-0 items-center gap-2 text-black">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-black text-sm font-bold text-brand-gold">CN</span>
            <span className="hidden text-base font-bold md:block">Cindy Nat</span>
          </Link>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex flex-1 items-center overflow-hidden rounded-full bg-white shadow-sm">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for products, brands and categories..."
              className="flex-1 px-5 py-2.5 text-sm text-slate-900 outline-none"
            />
            <button type="submit" className="flex h-full items-center bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
              Search
            </button>
          </form>

          {/* Cart */}
          <Link to="/cart" className="relative flex shrink-0 flex-col items-center text-black">
            <div className="relative">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </div>
            <span className="text-xs font-semibold">Cart</span>
          </Link>

          {/* Mobile menu button */}
          <button className="shrink-0 rounded-full border border-black/20 p-2 text-black md:hidden" onClick={() => setOpen(!open)}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={open ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
            </svg>
          </button>
        </div>
      </div>

      {/* Category nav bar */}
      <div className="hidden bg-white px-4 shadow-sm md:block md:px-8">
        <div className="mx-auto flex max-w-7xl items-center gap-6 py-2">
          <Link to="/shop" className="text-sm font-semibold text-brand-dark hover:text-brand-gold">All Categories</Link>
          <Link to="/shop?category=blenders" className="text-sm text-slate-600 hover:text-brand-gold">Blenders</Link>
          <Link to="/shop?category=rice-cookers" className="text-sm text-slate-600 hover:text-brand-gold">Rice Cookers</Link>
          <Link to="/shop?category=cookware" className="text-sm text-slate-600 hover:text-brand-gold">Cookware</Link>
          <Link to="/shop?category=electronics" className="text-sm text-slate-600 hover:text-brand-gold">Electronics</Link>
          <Link to="/shop?sort=popular" className="ml-auto text-sm font-semibold text-red-600 hover:text-red-700">🔥 Flash Deals</Link>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
          <form onSubmit={handleSearch} className="mb-4 flex overflow-hidden rounded-full border border-slate-200">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="flex-1 px-4 py-2 text-sm outline-none"
            />
            <button type="submit" className="bg-brand-dark px-4 text-sm text-white">Go</button>
          </form>
          <div className="flex flex-col gap-3">
            <Link to="/" className="text-sm font-medium text-slate-700" onClick={() => setOpen(false)}>Home</Link>
            <Link to="/shop" className="text-sm font-medium text-slate-700" onClick={() => setOpen(false)}>Shop</Link>
            <Link to="/cart" className="text-sm font-medium text-slate-700" onClick={() => setOpen(false)}>Cart {cartCount > 0 && `(${cartCount})`}</Link>
            {authenticated ? (
              <>
                <Link to="/dashboard" className="text-sm font-medium text-slate-700" onClick={() => setOpen(false)}>My Account</Link>
                <button onClick={() => { handleLogout(); setOpen(false); }} className="text-left text-sm font-medium text-slate-700">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-slate-700" onClick={() => setOpen(false)}>Login</Link>
                <Link to="/register" className="text-sm font-medium text-slate-700" onClick={() => setOpen(false)}>Register</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

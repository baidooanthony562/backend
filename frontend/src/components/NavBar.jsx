import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getAuthUser, isAuthenticated, isAdmin, logout } from '../utils/auth';

const menu = [
  { label: 'Home', path: '/' },
  { label: 'Shop', path: '/shop' },
  { label: 'Categories', path: '/shop' },
  { label: 'About Us', path: '/#about' },
  { label: 'Contact', path: '/#contact' },
];

export default function NavBar() {
  const [open, setOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = window.localStorage.getItem('cindyNutDark');
    const initial = stored === 'true';
    setDarkMode(initial);
    document.documentElement.classList.toggle('dark', initial);
    setAuthenticated(isAuthenticated());
    setAdminMode(isAdmin());
    setUser(getAuthUser());

    const updateAuth = () => {
      setAuthenticated(isAuthenticated());
      setAdminMode(isAdmin());
      setUser(getAuthUser());
    };

    window.addEventListener('storage', updateAuth);
    return () => window.removeEventListener('storage', updateAuth);
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    window.localStorage.setItem('cindyNutDark', next.toString());
    document.documentElement.classList.toggle('dark', next);
  };

  const handleLogout = () => {
    logout();
    setAuthenticated(false);
    setAdminMode(false);
    setUser(null);
    navigate('/');
  };

  return (
    <header className="fixed inset-x-0 top-0 z-40 bg-white/95 shadow-sm backdrop-blur-md dark:bg-slate-950/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
        <Link to="/" className="flex items-center gap-3 text-lg font-bold text-brand-dark dark:text-white">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-gold text-black">CN</span>
          Cindy Nut Enterprise
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {menu.map((item) => (
            <Link key={item.label} to={item.path} className="text-sm font-medium text-slate-700 transition hover:text-brand-dark dark:text-slate-300 dark:hover:text-brand-gold">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <button onClick={toggleDarkMode} className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 transition hover:border-brand-gold hover:text-brand-dark dark:border-slate-700 dark:text-slate-200 dark:hover:text-brand-gold">
            {darkMode ? 'Light' : 'Dark'}
          </button>
          {adminMode ? (
            <>
              <Link to="/admin" className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 transition hover:border-brand-gold hover:text-brand-dark dark:border-slate-700 dark:text-slate-200">
                Admin
              </Link>
              <button onClick={handleLogout} className="rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
                Logout
              </button>
            </>
          ) : authenticated ? (
            <>
              <Link to="/dashboard" className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 transition hover:border-brand-gold hover:text-brand-dark dark:border-slate-700 dark:text-slate-200">
                {user?.name || 'Dashboard'}
              </Link>
              <button onClick={handleLogout} className="rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 transition hover:border-brand-gold hover:text-brand-dark dark:border-slate-700 dark:text-slate-200">
                Login
              </Link>
              <Link to="/register" className="rounded-full bg-brand-gold px-4 py-2 text-sm font-semibold text-black transition hover:bg-yellow-400">
                Register
              </Link>
            </>
          )}
          <Link to="/cart" className="rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900">
            Cart
          </Link>
        </div>

        <button className="inline-flex items-center rounded-full border border-slate-200 p-2 text-slate-700 md:hidden dark:border-slate-700 dark:text-slate-200" onClick={() => setOpen(!open)}>
          <span className="sr-only">Menu</span>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={open ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden dark:border-slate-700 dark:bg-slate-950">
          <div className="flex flex-col gap-3">
            {menu.map((item) => (
              <Link key={item.label} to={item.path} className="text-base font-medium text-slate-700 dark:text-slate-200" onClick={() => setOpen(false)}>
                {item.label}
              </Link>
            ))}
            <button onClick={toggleDarkMode} className="text-base font-medium text-slate-700 dark:text-slate-200">
              {darkMode ? 'Light mode' : 'Dark mode'}
            </button>
            {adminMode ? (
              <>
                <Link to="/admin" className="text-base font-medium text-slate-700 dark:text-slate-200" onClick={() => setOpen(false)}>
                  Admin
                </Link>
                <button onClick={() => { handleLogout(); setOpen(false); }} className="text-base font-medium text-slate-700 dark:text-slate-200">
                  Logout
                </button>
              </>
            ) : authenticated ? (
              <>
                <Link to="/dashboard" className="text-base font-medium text-slate-700 dark:text-slate-200" onClick={() => setOpen(false)}>
                  Dashboard
                </Link>
                <button onClick={() => { handleLogout(); setOpen(false); }} className="text-base font-medium text-slate-700 dark:text-slate-200">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-base font-medium text-slate-700 dark:text-slate-200" onClick={() => setOpen(false)}>
                  Login
                </Link>
                <Link to="/register" className="text-base font-medium text-slate-700 dark:text-slate-200" onClick={() => setOpen(false)}>
                  Register
                </Link>
              </>
            )}
            <Link to="/cart" className="text-base font-medium text-slate-700 dark:text-slate-200" onClick={() => setOpen(false)}>
              Cart
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

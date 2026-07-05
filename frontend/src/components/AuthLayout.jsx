import { Link } from 'react-router-dom';
import Logo from './Logo';

// Shared split-screen shell for the customer auth pages (login / register /
// forgot password): a branded navy panel on the left, the form on the right.
// On mobile the panel collapses to a slim branded header above the form.
const TRUST = [
  { icon: 'fas fa-box-open', text: 'Track every order in one place' },
  { icon: 'fas fa-truck', text: 'Delivered nationwide across Ghana' },
];

const serif = { fontFamily: "Georgia, 'Times New Roman', serif" };

export default function AuthLayout({ children }) {
  return (
    <div className="mx-auto max-w-6xl px-0 sm:px-4 lg:my-6">
      <div className="grid min-h-[calc(100vh-9rem)] overflow-hidden bg-white sm:rounded-3xl sm:border sm:border-slate-200 sm:shadow-sm lg:grid-cols-2">

        {/* Brand panel — desktop */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#131921] via-[#18202b] to-[#0f2a1e] p-12 text-white lg:flex">
          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '26px 26px' }} />
          <Link to="/" className="relative flex w-fit items-center gap-5">
            <Logo size={96} />
            <div className="leading-tight">
              <p className="text-3xl font-bold" style={serif}>Cindy Nat</p>
              <p className="text-xs font-bold uppercase tracking-[0.34em] text-brand-gold">Enterprise</p>
            </div>
          </Link>

          <div className="relative">
            <h2 className="max-w-sm text-3xl font-extrabold leading-tight" style={serif}>Ghana's home for genuine appliances.</h2>
            <p className="mt-3 max-w-sm text-slate-300">Blenders, rice cookers, pots, fans and more — real brands, honest prices, delivered to your door.</p>
          </div>

          <ul className="relative space-y-3">
            {TRUST.map((t) => (
              <li key={t.text} className="flex items-center gap-3 text-sm text-slate-200">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-gold/15 text-brand-gold"><i className={t.icon}></i></span>
                {t.text}
              </li>
            ))}
          </ul>
        </div>

        {/* Brand strip — mobile */}
        <Link to="/" className="flex items-center gap-3 bg-[#131921] px-5 py-4 text-white lg:hidden">
          <Logo size={38} />
          <div className="leading-tight">
            <p className="text-base font-bold" style={serif}>Cindy Nat</p>
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-brand-gold">Enterprise</p>
          </div>
        </Link>

        {/* Form area */}
        <div className="flex items-center justify-center px-5 py-10 sm:px-10">
          <div className="w-full max-w-sm">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

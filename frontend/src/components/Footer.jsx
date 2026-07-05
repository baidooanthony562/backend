import { Link } from 'react-router-dom';
import Logo from './Logo';

const YEAR = new Date().getFullYear();
const serif = { fontFamily: "Georgia, 'Times New Roman', serif" };

const COLUMNS = [
  {
    title: 'Get to Know Us',
    links: [
      { label: 'About Cindy Nat', to: '/terms' },
      { label: 'Contact Us', href: 'mailto:baidooanthony562@gmail.com' },
      { label: 'Privacy Policy', to: '/privacy-policy' },
      { label: 'Terms & Conditions', to: '/terms' },
    ],
  },
  {
    title: 'Shop With Us',
    links: [
      { label: 'All Products', to: '/shop' },
      { label: "Today's Deals", to: '/shop?sort=popular' },
      { label: 'New Arrivals', to: '/shop?sort=newest' },
      { label: 'Best Prices', to: '/shop?sort=cheapest' },
    ],
  },
  {
    title: 'Your Account',
    links: [
      { label: 'Sign In', to: '/login' },
      { label: 'Create Account', to: '/register' },
      { label: 'Your Orders', to: '/orders' },
      { label: 'Your Wishlist', to: '/dashboard' },
    ],
  },
  {
    title: 'Help & Support',
    links: [
      { label: 'Email Us', href: 'mailto:baidooanthony562@gmail.com' },
      { label: 'WhatsApp Support', href: 'https://wa.me/233257543723' },
      { label: 'Delivery & Returns', to: '/terms' },
      { label: 'Track Your Order', to: '/orders' },
    ],
  },
];

function FooterLink({ label, to, href }) {
  const cls = 'hover:text-white hover:underline';
  if (to) return <Link to={to} className={cls}>{label}</Link>;
  return <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className={cls}>{label}</a>;
}

export default function Footer() {
  return (
    <footer>
      {/* Back to top */}
      <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="w-full bg-[#37475A] py-3 text-center text-sm font-semibold text-white transition hover:bg-[#485769]">
        Back to top
      </button>

      <div className="bg-[#232F3E] text-slate-300">
        <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">

          {/* Brand row */}
          <div className="flex flex-col gap-6 border-b border-white/10 pb-8 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Logo size={54} />
              <div>
                <p className="text-lg font-bold text-white" style={serif}>Cindy Nat Enterprise</p>
                <p className="mt-0.5 max-w-md text-sm text-slate-400">Genuine home &amp; kitchen appliances — delivered nationwide across Ghana.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a href="tel:0257543723" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
                <i className="fas fa-phone"></i> 0257543723
              </a>
              <a href="https://wa.me/233257543723" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700">
                <i className="fab fa-whatsapp"></i> WhatsApp
              </a>
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 py-8 md:grid-cols-4">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <p className="mb-3 font-bold text-white">{col.title}</p>
                <ul className="space-y-2 text-sm">
                  {col.links.map((l) => (
                    <li key={l.label}><FooterLink {...l} /></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <p>© {YEAR} Cindy Nat Enterprise. All rights reserved.</p>
            <p className="flex items-center gap-2"><i className="fas fa-lock text-brand-gold"></i> Secure payments via Paystack &amp; MTN MoMo</p>
            <p className="flex items-center gap-1.5"><i className="fas fa-map-marker-alt text-brand-gold"></i> Adum &amp; Alabar, Kumasi, Ghana</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

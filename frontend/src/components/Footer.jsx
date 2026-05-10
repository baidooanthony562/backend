import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-14 md:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gold text-sm font-bold text-black">CN</span>
              <span className="text-lg font-bold text-white">Cindy Nat Enterprise</span>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-400">
              Ghana's trusted home appliance store. Quality products, fast delivery, and exceptional customer service.
            </p>
            <div className="mt-4 flex gap-3">
              <a href="https://wa.me/233257543723" target="_blank" rel="noreferrer" className="rounded-full bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700">
                WhatsApp
              </a>
              <a href="mailto:baidooanthony562@gmail.com" className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:border-brand-gold hover:text-brand-gold">
                Email Us
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="mb-4 font-bold uppercase tracking-wider text-white">Shop</h4>
            <ul className="space-y-3 text-sm">
              <li><Link to="/shop" className="hover:text-brand-gold">All Products</Link></li>
              <li><Link to="/shop?sort=popular" className="hover:text-brand-gold">Best Sellers</Link></li>
              <li><Link to="/shop?sort=newest" className="hover:text-brand-gold">New Arrivals</Link></li>
              <li><Link to="/shop?sort=cheapest" className="hover:text-brand-gold">Deals & Offers</Link></li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="mb-4 font-bold uppercase tracking-wider text-white">Account</h4>
            <ul className="space-y-3 text-sm">
              <li><Link to="/login" className="hover:text-brand-gold">Login</Link></li>
              <li><Link to="/register" className="hover:text-brand-gold">Register</Link></li>
              <li><Link to="/dashboard" className="hover:text-brand-gold">My Orders</Link></li>
              <li><Link to="/dashboard" className="hover:text-brand-gold">Wishlist</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-4 font-bold uppercase tracking-wider text-white">Contact</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <span>📧</span> baidooanthony562@gmail.com
              </li>
              <li className="flex items-center gap-2">
                <span>📱</span> 0257543723
              </li>
              <li className="flex items-start gap-2">
                <span>📍</span>
                <span>Adum, Kumasi &amp; Alabar, Kumasi</span>
              </li>
            </ul>
            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">We Accept</p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded bg-slate-800 px-2 py-1">Mobile Money</span>
                <span className="rounded bg-slate-800 px-2 py-1">Visa</span>
                <span className="rounded bg-slate-800 px-2 py-1">Mastercard</span>
                <span className="rounded bg-slate-800 px-2 py-1">Cash</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-800 px-4 py-5 text-center text-xs text-slate-500 md:px-8">
        © 2026 Cindy Nat Enterprise. All rights reserved. Built for modern Ghanaian homes.
      </div>
    </footer>
  );
}

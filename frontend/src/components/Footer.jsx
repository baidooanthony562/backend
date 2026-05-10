import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer>
      {/* Back to top */}
      <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="w-full bg-[#37475A] py-3 text-center text-sm font-semibold text-white transition hover:bg-[#485769]">
        Back to top
      </button>

      {/* Main footer */}
      <div className="bg-[#232F3E] px-4 py-10 text-slate-300 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-4">
          <div>
            <p className="mb-3 font-bold text-white">Get to Know Us</p>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-white hover:underline">About Cindy Nat</Link></li>
              <li><a href="mailto:baidooanthony562@gmail.com" className="hover:text-white hover:underline">Contact Us</a></li>
              <li><span className="text-slate-400">Adum & Alabar, Kumasi</span></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 font-bold text-white">Shop With Us</p>
            <ul className="space-y-2 text-sm">
              <li><Link to="/shop" className="hover:text-white hover:underline">All Products</Link></li>
              <li><Link to="/shop?sort=popular" className="hover:text-white hover:underline">Today's Deals</Link></li>
              <li><Link to="/shop?sort=newest" className="hover:text-white hover:underline">New Arrivals</Link></li>
              <li><Link to="/shop?sort=cheapest" className="hover:text-white hover:underline">Best Prices</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 font-bold text-white">Your Account</p>
            <ul className="space-y-2 text-sm">
              <li><Link to="/login" className="hover:text-white hover:underline">Sign In</Link></li>
              <li><Link to="/register" className="hover:text-white hover:underline">Create Account</Link></li>
              <li><Link to="/orders" className="hover:text-white hover:underline">Your Orders</Link></li>
              <li><Link to="/dashboard" className="hover:text-white hover:underline">Your Wishlist</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 font-bold text-white">Help & Support</p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><span>📱</span> 0257543723</li>
              <li className="flex items-center gap-2"><span>📧</span> baidooanthony562@gmail.com</li>
              <li className="flex items-center gap-2"><span>📍</span> Adum & Alabar, Kumasi</li>
              <li>
                <a href="https://wa.me/233257543723" target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 rounded bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700">
                  💬 WhatsApp Us
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bg-[#131921] px-4 py-6 text-center md:px-8">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="flex h-7 w-7 items-center justify-center rounded bg-brand-gold text-xs font-extrabold text-black">CN</span>
          <span className="text-sm font-bold text-white">Cindy Nat Enterprise</span>
        </div>
        <div className="flex flex-wrap justify-center gap-4 text-xs text-slate-400 mb-3">
          <span className="rounded bg-slate-700 px-2 py-1">Mobile Money</span>
          <span className="rounded bg-slate-700 px-2 py-1">Visa</span>
          <span className="rounded bg-slate-700 px-2 py-1">Mastercard</span>
          <span className="rounded bg-slate-700 px-2 py-1">Cash on Delivery</span>
        </div>
        <p className="text-xs text-slate-500">© 2026 Cindy Nat Enterprise. All rights reserved. Adum & Alabar, Kumasi, Ghana.</p>
      </div>
    </footer>
  );
}

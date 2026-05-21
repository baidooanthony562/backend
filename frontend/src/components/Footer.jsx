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
        <div className="mx-auto grid max-w-7xl gap-8 grid-cols-2 md:grid-cols-4">
          <div>
            <p className="mb-3 font-bold text-white">Get to Know Us</p>
            <ul className="space-y-2 text-sm">
              <li><Link to="/terms" className="hover:text-white hover:underline">About Cindy Nat</Link></li>
              <li><a href="mailto:baidooanthony562@gmail.com" className="hover:text-white hover:underline">Contact Us</a></li>
              <li><Link to="/privacy-policy" className="hover:text-white hover:underline">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-white hover:underline">Terms & Conditions</Link></li>
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
              <li className="flex items-center gap-2"><i className="fas fa-phone w-4 text-center"></i> 0257543723</li>
              <li className="flex items-center gap-2"><i className="fas fa-envelope w-4 text-center"></i> baidooanthony562@gmail.com</li>
              <li className="flex items-center gap-2"><i className="fas fa-map-marker-alt w-4 text-center"></i> Adum & Alabar, Kumasi</li>
              <li>
                <a href="https://wa.me/233257543723" target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 rounded bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700">
                  <i className="fab fa-whatsapp mr-1"></i> WhatsApp Us
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

    </footer>
  );
}

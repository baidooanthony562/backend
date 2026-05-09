import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAuthUser, getToken, isAuthenticated } from '../utils/auth';
import { fetchUserOrders, fetchWishlist, fetchUserProfile, removeWishlistItem } from '../utils/api';

export default function UserDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(getAuthUser());
  const [orders, setOrders] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = getToken();

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const [profileRes, ordersRes, wishlistRes] = await Promise.all([
          fetchUserProfile(token),
          fetchUserOrders(token),
          fetchWishlist(token),
        ]);
        setProfile(profileRes.data);
        setOrders(ordersRes.data);
        setWishlist(wishlistRes.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate, token]);

  const handleRemoveWishlist = async (productId) => {
    try {
      const response = await removeWishlistItem(productId, token);
      setWishlist(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update wishlist');
    }
  };

  return (
    <section className="mx-auto max-w-6xl px-4 pb-24 pt-8 md:px-8">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-10 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">Welcome back, {profile?.name || 'Customer'}</h1>
        <p className="mt-3 text-slate-600">Manage your orders, wishlist, and customer support requests in one place.</p>

        {error && <div className="mt-6 rounded-3xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <h2 className="text-xl font-semibold text-slate-900">Profile details</h2>
            <p className="mt-4 text-sm text-slate-600">Name: {profile?.name || 'N/A'}</p>
            <p className="mt-2 text-sm text-slate-600">Email: {profile?.email || 'N/A'}</p>
            <p className="mt-2 text-sm text-slate-600">Phone: {profile?.phone || 'Not set'}</p>
            <p className="mt-2 text-sm text-slate-600">City: {profile?.city || 'Not set'}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <h2 className="text-xl font-semibold text-slate-900">Account overview</h2>
            <p className="mt-4 text-sm text-slate-600">You have {orders.length} orders and {wishlist.length} wishlist items.</p>
            <p className="mt-2 text-sm text-slate-600">Need help? Use live chat or contact support directly.</p>
          </div>
        </div>

        <div className="mt-12 grid gap-8 xl:grid-cols-[1.4fr_0.8fr]">
          <div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-bold text-slate-900">Recent orders</h2>
              <Link to="/orders" className="rounded-full border border-slate-200 bg-brand-gold px-4 py-2 text-sm font-semibold text-black transition hover:bg-yellow-400">
                View all
              </Link>
            </div>
              <div className="mt-6 space-y-4">
                {loading ? (
                  <p className="text-slate-500">Loading orders...</p>
                ) : orders.length === 0 ? (
                  <p className="text-slate-500">No orders found yet. Start shopping to build your order history.</p>
                ) : (
                  orders.map((order) => (
                    <Link key={order._id} to={`/orders/${order._id}`} className="block rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:border-brand-gold">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">Order #{order._id.slice(-6).toUpperCase()}</p>
                          <p className="text-sm text-slate-500">Placed {new Date(order.createdAt).toLocaleDateString()}</p>
                        </div>
                        <span className="rounded-full bg-brand-gold px-3 py-1 text-sm font-semibold text-black">{order.status}</span>
                      </div>
                      <p className="mt-3 text-sm text-slate-600">Total: ${order.totalPrice.toFixed(2)}</p>
                      {order.promoCode && <p className="mt-1 text-sm text-slate-600">Promo: {order.promoCode} (-${order.discountPrice.toFixed(2)})</p>}
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">Wishlist</h2>
            <div className="mt-6 space-y-4">
              {loading ? (
                <p className="text-slate-500">Loading wishlist...</p>
              ) : wishlist.length === 0 ? (
                <p className="text-slate-500">Your wishlist is empty. Add items from the shop to save them for later.</p>
              ) : (
                wishlist.map((product) => (
                  <div key={product._id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-900">{product.name}</p>
                        <p className="text-sm text-slate-500">${product.price.toFixed(2)}</p>
                      </div>
                      <button onClick={() => handleRemoveWishlist(product._id)} className="rounded-full bg-rose-100 px-4 py-2 text-sm text-rose-700 transition hover:bg-rose-200">
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchUserOrders } from '../utils/api';
import { getToken, isAuthenticated } from '../utils/auth';

export default function OrderHistory() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = getToken();

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }

    const loadOrders = async () => {
      setLoading(true);
      try {
        const { data } = await fetchUserOrders(token);
        setOrders(data);
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load order history.');
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [navigate, token]);

  return (
    <section className="mx-auto max-w-6xl px-4 pb-24 pt-8 md:px-8">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[2rem] sm:p-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-brand-gold">Order history</p>
            <h1 className="mt-3 text-xl font-bold text-slate-900 sm:text-3xl">Your recent purchase history</h1>
          </div>
          <Link to="/dashboard" className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-brand-gold px-6 py-3 text-sm font-semibold text-black transition hover:bg-yellow-400">
            Back to dashboard
          </Link>
        </div>

        {error && <div className="mt-8 rounded-3xl bg-rose-50 p-6 text-sm text-rose-700">{error}</div>}

        <div className="mt-8 space-y-4">
          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-slate-500">Loading order history...</div>
          ) : orders.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-slate-500">You haven't placed any orders yet.</div>
          ) : (
            orders.map((order) => (
              <Link key={order._id} to={`/orders/${order._id}`} className="block rounded-3xl border border-slate-200 bg-slate-50 p-6 transition hover:border-brand-gold">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">Order #{order._id.slice(-8).toUpperCase()}</p>
                    <p className="text-sm text-slate-500">Placed {new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-brand-gold px-3 py-1 text-sm font-semibold text-black">{order.status}</span>
                    <p className="text-sm text-slate-600">₵{order.totalPrice.toFixed(2)}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm text-slate-600">
                  <p>{order.orderItems.length} item{order.orderItems.length !== 1 ? 's' : ''}</p>
                  {order.promoCode ? <p>Promo: {order.promoCode}</p> : <p>No promo code</p>}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchOrderDetail, fetchGuestOrder } from '../utils/api';
import { getToken, isAuthenticated } from '../utils/auth';

function addBusinessDays(date, days) {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return result;
}

function formatDate(date) {
  return date.toLocaleDateString('en-GH', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function OrderConfirmation() {
  const { id } = useParams();
  const token = getToken();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadOrder = async () => {
      setLoading(true);
      try {
        if (isAuthenticated()) {
          const { data } = await fetchOrderDetail(id, token);
          setOrder(data);
        } else {
          const guestToken = sessionStorage.getItem(`guestOrderToken:${id}`);
          if (!guestToken) { setError('Order not found.'); return; }
          const { data } = await fetchGuestOrder(id, guestToken);
          setOrder(data);
          sessionStorage.removeItem(`guestOrderToken:${id}`);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load order confirmation.');
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [id]);

  if (loading) {
    return (
      <section className="mx-auto max-w-6xl px-4 pb-24 pt-8 md:px-8">
        <div className="rounded-[2rem] bg-white p-10 shadow-sm text-center">Loading order confirmation...</div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 pb-24 pt-8 md:px-8">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[2rem] sm:p-10">
        {error ? (
          <div className="rounded-3xl bg-rose-50 p-8 text-center text-rose-700">{error}</div>
        ) : !order ? (
          <div className="rounded-3xl bg-slate-50 p-8 text-center text-slate-500">Loading order details...</div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 text-2xl text-green-600"><i className="fas fa-check"></i></div>
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900">Order confirmed!</h1>
                <p className="mt-0.5 text-sm text-slate-500">A confirmation email has been sent to you.</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {/* Delivery estimate banner */}
              {(() => {
                const placed = new Date(order.createdAt);
                const earliest = addBusinessDays(placed, 2);
                const latest = addBusinessDays(placed, 3);
                return (
                  <div className="flex items-center gap-4 rounded-xl border border-green-200 bg-green-50 px-5 py-4">
                    <i className="fas fa-truck text-2xl text-green-700"></i>
                    <div>
                      <p className="text-sm font-bold text-green-800">Estimated delivery</p>
                      <p className="text-base font-extrabold text-green-900">
                        {formatDate(earliest)} – {formatDate(latest)}
                      </p>
                      <p className="text-xs text-green-700 mt-0.5">Within Kumasi · 2–3 business days</p>
                    </div>
                  </div>
                );
              })()}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-brand-gold">Order reference</p>
                <p className="mt-2 text-2xl font-extrabold text-slate-900">#{order._id.slice(-8).toUpperCase()}</p>
                <p className="mt-1 text-sm text-slate-500">Placed on {new Date(order.createdAt).toLocaleDateString('en-GH', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-white p-6">
                  <h2 className="text-xl font-semibold text-slate-900">Shipping details</h2>
                  <p className="mt-4 text-sm text-slate-600">{order.shippingAddress.address}</p>
                  <p className="mt-1 text-sm text-slate-600">{order.shippingAddress.city}</p>
                  <p className="mt-1 text-sm text-slate-600">{order.shippingAddress.phone}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-6">
                  <h2 className="text-xl font-semibold text-slate-900">Order summary</h2>
                  <div className="mt-4 space-y-2 text-sm text-slate-600">
                    <p>Total items: {order.orderItems.length}</p>
                    <p>Payment method: {order.paymentMethod}</p>
                    <p>Status: {order.status}</p>
                    <p>Order total: ₵{order.totalPrice.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6">
                <h2 className="text-xl font-semibold text-slate-900">Items in your order</h2>
                <div className="mt-4 space-y-4">
                  {order.orderItems.map((item) => (
                    <div key={item.product} className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <div>
                        <p className="font-semibold text-slate-900">{item.name}</p>
                        <p className="text-sm text-slate-600">Qty: {item.quantity}</p>
                      </div>
                      <span className="ml-auto text-sm font-semibold text-slate-900">₵{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <h2 className="text-sm font-bold text-slate-900">Shipping to</h2>
                  <p className="mt-2 text-sm text-slate-600">{order.shippingAddress?.address}</p>
                  <p className="text-sm text-slate-600">{order.shippingAddress?.city}</p>
                  <p className="text-sm text-slate-600">{order.shippingAddress?.phone}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <h2 className="text-sm font-bold text-slate-900">Payment</h2>
                  <p className="mt-2 text-sm text-slate-600">{order.paymentMethod}</p>
                  <p className="text-sm text-slate-600">Total: <strong className="text-slate-900">₵{Number(order.totalPrice).toFixed(2)}</strong></p>
                  <p className="text-sm text-slate-600">Status: <span className="font-semibold text-amber-700">{order.status}</span></p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="mb-3 text-sm font-bold text-slate-900">Items ordered</h2>
                <div className="space-y-3">
                  {order.orderItems.map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500">Qty: {item.quantity}</p>
                      </div>
                      <span className="text-sm font-bold text-slate-900">₵{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                {isAuthenticated() && (
                  <Link to="/orders" className="inline-flex items-center justify-center rounded-full bg-brand-dark px-8 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                    View my orders
                  </Link>
                )}
                <Link to="/shop" className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-8 py-3 text-sm font-semibold text-slate-900 transition hover:border-brand-gold">
                  Continue shopping
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

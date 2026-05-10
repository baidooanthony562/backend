import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchOrderDetail } from '../utils/api';
import { getToken } from '../utils/auth';

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
        const { data } = await fetchOrderDetail(id, token);
        setOrder(data);
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
      <div className="rounded-[2rem] border border-slate-200 bg-white p-10 shadow-sm">
        {error ? (
          <div className="rounded-3xl bg-rose-50 p-8 text-center text-rose-700">{error}</div>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-slate-900">Thank you for your order!</h1>
            <p className="mt-3 text-slate-600">Your order has been received and is being processed. You can view your order details below.</p>

            <div className="mt-10 space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-sm uppercase tracking-[0.3em] text-brand-gold">Order reference</p>
                <p className="mt-3 text-2xl font-semibold text-slate-900">#{order._id.slice(-8).toUpperCase()}</p>
                <p className="mt-2 text-sm text-slate-600">Placed on {new Date(order.createdAt).toLocaleDateString()}</p>
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

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link to="/dashboard" className="inline-flex items-center justify-center rounded-full bg-brand-dark px-8 py-4 text-sm font-semibold text-white transition hover:bg-slate-800">
                  Go to dashboard
                </Link>
                <Link to="/shop" className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-8 py-4 text-sm font-semibold text-slate-900 transition hover:border-brand-gold">
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

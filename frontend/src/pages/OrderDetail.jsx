import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchOrderDetail } from '../utils/api';
import { getToken } from '../utils/auth';

export default function OrderDetail() {
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
        setError(err.response?.data?.message || 'Order not found');
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [id]);

  if (loading) {
    return (
      <section className="mx-auto max-w-6xl px-4 pb-24 pt-8 md:px-8">
        <div className="rounded-[2rem] bg-white p-10 shadow-sm text-center">Loading order details...</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mx-auto max-w-6xl px-4 pb-24 pt-8 md:px-8">
        <div className="rounded-[2rem] bg-rose-50 p-10 shadow-sm text-center text-rose-700">{error}</div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 pb-24 pt-8 md:px-8">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-10 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-brand-gold">Order details</p>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">Order #{order._id.slice(-8).toUpperCase()}</h1>
          </div>
          <span className="rounded-full bg-brand-gold px-4 py-2 text-sm font-semibold text-black">{order.status}</span>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <h2 className="text-lg font-semibold text-slate-900">Shipping</h2>
            <p className="mt-4 text-sm text-slate-600">{order.shippingAddress.address}</p>
            <p className="mt-1 text-sm text-slate-600">{order.shippingAddress.city}</p>
            <p className="mt-1 text-sm text-slate-600">{order.shippingAddress.phone}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <h2 className="text-lg font-semibold text-slate-900">Payment</h2>
            <p className="mt-4 text-sm text-slate-600">Method: {order.paymentMethod}</p>
            <p className="mt-1 text-sm text-slate-600">Total: ₵{order.totalPrice.toFixed(2)}</p>
            {order.promoCode && <p className="mt-1 text-sm text-slate-600">Promo: {order.promoCode}</p>}
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <h2 className="text-lg font-semibold text-slate-900">Timeline</h2>
            <p className="mt-4 text-sm text-slate-600">Placed: {new Date(order.createdAt).toLocaleDateString()}</p>
            <p className="mt-1 text-sm text-slate-600">Paid: {order.isPaid ? new Date(order.paidAt).toLocaleDateString() : 'Pending'}</p>
            <p className="mt-1 text-sm text-slate-600">Delivered: {order.isDelivered ? new Date(order.deliveredAt).toLocaleDateString() : 'Pending'}</p>
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">Items</h2>
          <div className="mt-4 space-y-4">
            {order.orderItems.map((item) => (
              <div key={item.product} className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
                <div>
                  <p className="font-semibold text-slate-900">{item.name}</p>
                  <p className="text-sm text-slate-600">Quantity: {item.quantity}</p>
                </div>
                <span className="ml-auto text-sm font-semibold text-slate-900">₵{(item.quantity * item.price).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link to="/dashboard" className="inline-flex items-center justify-center rounded-full bg-brand-dark px-8 py-4 text-sm font-semibold text-white transition hover:bg-slate-800">
            Back to dashboard
          </Link>
          <Link to="/shop" className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-8 py-4 text-sm font-semibold text-slate-900 transition hover:border-brand-gold">
            Continue shopping
          </Link>
        </div>
      </div>
    </section>
  );
}

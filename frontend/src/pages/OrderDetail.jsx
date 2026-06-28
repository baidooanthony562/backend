import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchOrderDetail } from '../utils/api';
import { getToken } from '../utils/auth';
import OrderStatusTracker from '../components/OrderStatusTracker';

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
      <div className="space-y-5">

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-gold">Order details</p>
            <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Order #{order._id.slice(-8).toUpperCase()}</h1>
            <p className="mt-0.5 text-sm text-slate-500">Placed on {new Date(order.createdAt).toLocaleDateString('en-GH', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <Link to="/orders" className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:border-brand-gold transition">
            ← All orders
          </Link>
        </div>

        {/* Refund banner — shows above the tracker once an admin has refunded
            the order. The tracker itself will already render the "Cancelled"
            state below, so this banner adds the money-side details. */}
        {order.isRefunded && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
            <div className="flex items-start gap-3">
              <i className="fas fa-check-circle mt-0.5 text-2xl text-emerald-600"></i>
              <div>
                <p className="font-bold text-emerald-800">Refunded — ₵{Number(order.totalPrice || 0).toFixed(2)}</p>
                <p className="mt-0.5 text-sm text-emerald-700">
                  Refund processed on {new Date(order.refundedAt).toLocaleDateString('en-GH', { day: 'numeric', month: 'long', year: 'numeric' })}.
                  Refunds to your card typically appear in your statement within 5–10 business days.
                </p>
                {order.refundReason && (
                  <p className="mt-1 text-xs text-emerald-700"><strong>Reason:</strong> {order.refundReason}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Status tracker */}
        <OrderStatusTracker status={order.status} />

        {/* Info grid */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-bold text-slate-900">Shipping address</h2>
            <p className="text-sm text-slate-600">{order.shippingAddress.address}</p>
            <p className="text-sm text-slate-600">{order.shippingAddress.city}</p>
            <p className="text-sm text-slate-600">{order.shippingAddress.phone}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-bold text-slate-900">Payment</h2>
            <p className="text-sm text-slate-600">Method: {order.paymentMethod}</p>
            <p className="text-sm text-slate-600">Total: <strong className="text-slate-900">₵{order.totalPrice.toFixed(2)}</strong></p>
            {order.promoCode && <p className="text-sm text-slate-600">Promo: {order.promoCode}</p>}
            <p className="text-sm text-slate-600">Placed: {new Date(order.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Items */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-bold text-slate-900">Items ordered</h2>
          <div className="space-y-3">
            {order.orderItems.map((item) => (
              <div key={item.product} className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                <div>
                  <p className="font-semibold text-slate-900">{item.name}</p>
                  <p className="text-xs text-slate-500">Qty: {item.quantity}</p>
                </div>
                <span className="text-sm font-bold text-slate-900">₵{(item.quantity * item.price).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end border-t border-slate-100 pt-3">
            <p className="text-sm font-bold text-slate-900">Total: ₵{order.totalPrice.toFixed(2)}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link to="/shop" className="inline-flex items-center justify-center rounded-full bg-brand-gold px-8 py-3 text-sm font-semibold text-slate-900 hover:bg-yellow-400 transition">
            Continue shopping
          </Link>
          <Link to="/orders" className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-8 py-3 text-sm font-semibold text-slate-900 hover:border-brand-gold transition">
            View all orders
          </Link>
        </div>
      </div>
    </section>
  );
}

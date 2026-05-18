import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchOrderDetail } from '../utils/api';
import { getToken } from '../utils/auth';

const STEPS = ['Pending', 'Processing', 'Shipped', 'Delivered'];

const STEP_ICONS = {
  Pending:    '🕐',
  Processing: '📦',
  Shipped:    '🚚',
  Delivered:  '✅',
};

const STEP_DESC = {
  Pending:    'Order received, awaiting confirmation',
  Processing: 'Your order is being packed',
  Shipped:    'On the way to you',
  Delivered:  'Delivered successfully',
};

function StatusTracker({ status }) {
  const isCancelled = status === 'Cancelled';
  const currentIndex = STEPS.indexOf(status);

  if (isCancelled) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
        <span className="text-2xl">❌</span>
        <div>
          <p className="font-bold text-red-800">Order Cancelled</p>
          <p className="text-sm text-red-600">This order has been cancelled.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="mb-6 text-base font-bold text-slate-900">Order Status</h2>
      <div className="relative">
        {/* Progress line */}
        <div className="absolute left-5 top-5 h-[calc(100%-2.5rem)] w-0.5 bg-slate-200" />
        <div
          className="absolute left-5 top-5 w-0.5 bg-green-500 transition-all duration-500"
          style={{ height: currentIndex <= 0 ? 0 : `${(currentIndex / (STEPS.length - 1)) * 100}%` }}
        />

        <div className="space-y-6">
          {STEPS.map((step, i) => {
            const done = i < currentIndex;
            const active = i === currentIndex;
            return (
              <div key={step} className="relative flex items-start gap-4 pl-14">
                {/* Circle */}
                <div className={`absolute left-0 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-lg transition-all ${
                  done    ? 'border-green-500 bg-green-500 text-white' :
                  active  ? 'border-brand-gold bg-white shadow-md' :
                            'border-slate-200 bg-white text-slate-300'
                }`}>
                  {done ? '✓' : STEP_ICONS[step]}
                </div>
                <div className={active ? '' : done ? 'opacity-70' : 'opacity-40'}>
                  <p className={`font-semibold ${active ? 'text-slate-900' : 'text-slate-700'}`}>{step}</p>
                  <p className="text-xs text-slate-500">{STEP_DESC[step]}</p>
                  {active && (
                    <span className="mt-1 inline-block rounded-full bg-brand-gold px-2 py-0.5 text-xs font-bold text-black">
                      Current status
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

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

        {/* Status tracker */}
        <StatusTracker status={order.status} />

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

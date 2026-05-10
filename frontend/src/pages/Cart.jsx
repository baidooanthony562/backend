import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createOrder, validatePromo } from '../utils/api';
import { getAuthUser, getToken, isAuthenticated } from '../utils/auth';

export default function Cart() {
  const navigate = useNavigate();
  const user = getAuthUser();
  const [cartItems, setCartItems] = useState([]);
  const [promoCode, setPromoCode] = useState('');
  const [promoResult, setPromoResult] = useState(null);
  const [promoError, setPromoError] = useState('');
  const [applying, setApplying] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState('');
  const [shipping, setShipping] = useState({ address: '', city: '', phone: '' });
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [placingOrder, setPlacingOrder] = useState(false);
  const token = getToken();

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('cart') || '[]');
    setCartItems(stored);
  }, []);

  const total = useMemo(() => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0), [cartItems]);
  const finalTotal = promoResult ? promoResult.totalAfterDiscount : total;

  const updateQuantity = (id, action) => {
    const next = cartItems.map((item) => {
      if (item.id !== id) return item;
      const nextQty = action === 'add' ? item.quantity + 1 : item.quantity - 1;
      return { ...item, quantity: Math.max(1, nextQty) };
    });
    setCartItems(next);
    localStorage.setItem('cart', JSON.stringify(next));
  };

  const removeItem = (id) => {
    const next = cartItems.filter((item) => item.id !== id);
    setCartItems(next);
    localStorage.setItem('cart', JSON.stringify(next));
  };

  const applyPromo = async () => {
    if (!promoCode.trim()) {
      setPromoError('Enter a promo code to apply.');
      return;
    }
    setPromoError('');
    setApplying(true);
    try {
      const { data } = await validatePromo(promoCode.trim(), total);
      setPromoResult(data);
      setPromoError('Promo code applied!');
    } catch (err) {
      setPromoResult(null);
      setPromoError(err.response?.data?.message || 'Unable to apply promo code.');
    } finally {
      setApplying(false);
    }
  };

  const handleCheckout = async () => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }
    if (cartItems.length === 0) {
      setCheckoutMessage('Add at least one item to complete checkout.');
      return;
    }
    if (!shipping.address || !shipping.city || !shipping.phone) {
      setCheckoutMessage('Please fill in your shipping address before checkout.');
      return;
    }

    setPlacingOrder(true);
    setCheckoutMessage('');

    const orderItems = cartItems.map((item) => ({
      product: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      image: item.image,
    }));

    const payload = {
      orderItems,
      shippingAddress: shipping,
      paymentMethod,
      subtotalPrice: total,
      discountPrice: promoResult ? promoResult.discountAmount : 0,
      promoCode: promoResult ? promoResult.code : '',
      totalPrice: finalTotal,
    };

    try {
      const { data } = await createOrder(payload, token);
      localStorage.removeItem('cart');
      setCartItems([]);
      setPromoResult(null);
      setPromoCode('');
      navigate(`/order-confirmation/${data._id}`);
    } catch (err) {
      setCheckoutMessage(err.response?.data?.message || 'Unable to place order.');
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <section className="mx-auto max-w-6xl px-4 pb-24 pt-8 md:px-8">
      <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-brand-gold">Your cart</p>
          <h1 className="mt-3 text-4xl font-bold text-slate-900">Review items before checkout</h1>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.8fr_0.9fr]">
        <div className="space-y-5">
          {cartItems.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-600">
              Your cart is empty. <Link to="/shop" className="text-brand-dark underline">Browse products</Link>.
            </div>
          ) : (
            cartItems.map((item) => (
              <div key={item.id} className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 sm:flex-row sm:items-center">
                <img src={item.image} alt={item.name} className="h-32 w-32 rounded-3xl object-cover" />
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-slate-900">{item.name}</h2>
                  <p className="mt-2 text-sm text-slate-500">{item.category || 'Product'}</p>
                  <p className="mt-3 text-lg font-semibold text-brand-dark">₵{item.price.toFixed(2)}</p>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-2">
                    <button onClick={() => updateQuantity(item.id, 'subtract')} className="rounded-full bg-white px-3 py-1 text-slate-700">-</button>
                    <span className="min-w-[2rem] text-center text-sm font-semibold text-slate-900">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 'add')} className="rounded-full bg-white px-3 py-1 text-slate-700">+</button>
                  </div>
                  <button onClick={() => removeItem(item.id)} className="text-sm text-rose-600 transition hover:text-rose-800">Remove</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Order summary</h2>
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Subtotal</span>
              <span>₵{total.toFixed(2)}</span>
            </div>
            {promoResult && (
              <div className="flex items-center justify-between text-sm text-emerald-600">
                <span>Promo savings</span>
                <span>- ₵{promoResult.discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Delivery</span>
              <span>Free over ₵100</span>
            </div>
            <div className="border-t border-slate-200 pt-4 text-lg font-semibold text-slate-900">
              <span>Total</span>
              <span className="float-right">₵{finalTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <label className="block text-sm font-medium text-slate-700">Shipping address</label>
              <input
                value={shipping.address}
                onChange={(e) => setShipping({ ...shipping, address: e.target.value })}
                placeholder="Street address"
                className="mt-3 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-brand-gold"
              />
              <input
                value={shipping.city}
                onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
                placeholder="City"
                className="mt-3 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-brand-gold"
              />
              <input
                value={shipping.phone}
                onChange={(e) => setShipping({ ...shipping, phone: e.target.value })}
                placeholder="Phone number"
                className="mt-3 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-brand-gold"
              />
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <label className="block text-sm font-medium text-slate-700">Payment method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="mt-3 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-brand-gold"
              >
                <option value="card">Credit / Debit card</option>
                <option value="bank-transfer">Bank transfer</option>
                <option value="cash-on-delivery">Cash on delivery</option>
              </select>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <label className="block text-sm font-medium text-slate-700">Promo code</label>
              <div className="mt-3 flex gap-2">
                <input
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Enter code"
                  className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-brand-gold"
                />
                <button onClick={applyPromo} disabled={applying} className="rounded-full bg-brand-dark px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">
                  Apply
                </button>
              </div>
              {promoError && <p className="mt-3 text-sm text-slate-600">{promoError}</p>}
            </div>

            <button onClick={handleCheckout} disabled={placingOrder} className="w-full rounded-full bg-brand-dark px-6 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">
              {placingOrder ? 'Placing order...' : 'Proceed to checkout'}
            </button>
            {checkoutMessage && <p className="mt-3 text-sm text-slate-500">{checkoutMessage}</p>}
          </div>
          <p className="mt-4 text-sm text-slate-500">Secure support available through our live chat while you check out.</p>
        </div>
      </div>
    </section>
  );
}

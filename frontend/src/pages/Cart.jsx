import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createOrder, validatePromo } from '../utils/api';
import { getAuthUser, getToken, isAuthenticated } from '../utils/auth';

function resolveUnitPrice(item) {
  const qty = item.quantity;
  const hasWholesale = item.wholesalePrice && item.wholesaleMinQty;
  if (hasWholesale && qty >= item.wholesaleMinQty) return item.wholesalePrice;
  return item.retailPrice || item.price;
}

export default function Cart() {
  const navigate = useNavigate();
  const user = getAuthUser();
  const [cartItems, setCartItems] = useState([]);
  const [promoCode, setPromoCode] = useState('');
  const [promoResult, setPromoResult] = useState(null);
  const [promoMessage, setPromoMessage] = useState({ text: '', success: false });
  const [applying, setApplying] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState('');
  const [shipping, setShipping] = useState({ address: '', city: '', phone: '' });
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [placingOrder, setPlacingOrder] = useState(false);
  const token = getToken();

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('cart') || '[]');
    setCartItems(stored.map((item) => ({ ...item, unitPrice: resolveUnitPrice(item) })));
  }, []);

  const total = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [cartItems]
  );
  const finalTotal = promoResult ? promoResult.totalAfterDiscount : total;

  const persist = (next) => {
    setCartItems(next);
    localStorage.setItem('cart', JSON.stringify(next));
    window.dispatchEvent(new Event('storage'));
  };

  const updateQuantity = (id, action) => {
    const next = cartItems.map((item) => {
      if ((item.id || item._id) !== id) return item;
      const nextQty = action === 'add' ? item.quantity + 1 : Math.max(1, item.quantity - 1);
      return { ...item, quantity: nextQty, unitPrice: resolveUnitPrice({ ...item, quantity: nextQty }) };
    });
    persist(next);
  };

  const removeItem = (id) => {
    persist(cartItems.filter((item) => (item.id || item._id) !== id));
  };

  const applyPromo = async () => {
    if (!promoCode.trim()) {
      setPromoMessage({ text: 'Enter a promo code to apply.', success: false });
      return;
    }
    setPromoMessage({ text: '', success: false });
    setApplying(true);
    try {
      const { data } = await validatePromo(promoCode.trim(), total);
      setPromoResult(data);
      setPromoMessage({ text: `Promo applied! You save ₵${data.discountAmount?.toFixed(2) || '0.00'}.`, success: true });
    } catch (err) {
      setPromoResult(null);
      setPromoMessage({ text: err.response?.data?.message || 'Invalid or expired promo code.', success: false });
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
      product: item.id || item._id,
      name: item.name,
      quantity: item.quantity,
      price: item.unitPrice,
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
      window.dispatchEvent(new Event('storage'));
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
            cartItems.map((item) => {
              const itemId = item.id || item._id;
              const hasWholesale = item.wholesalePrice && item.wholesaleMinQty;
              const isWholesale = hasWholesale && item.quantity >= item.wholesaleMinQty;
              const toWholesale = hasWholesale && !isWholesale ? item.wholesaleMinQty - item.quantity : 0;

              return (
                <div key={itemId} className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 sm:flex-row sm:items-center">
                  <img src={item.image} alt={item.name} className="h-32 w-32 rounded-3xl object-cover" onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80'; }} />
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-slate-900">{item.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">{item.category || 'Product'}</p>

                    <div className="mt-2 flex items-center gap-2">
                      <p className={`text-lg font-semibold ${isWholesale ? 'text-emerald-600' : 'text-brand-dark'}`}>
                        ₵{item.unitPrice.toFixed(2)}/unit
                      </p>
                      {isWholesale && (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                          Wholesale Price
                        </span>
                      )}
                    </div>

                    {toWholesale > 0 && (
                      <button
                        onClick={() => updateQuantity(itemId, 'add')}
                        className="mt-1 text-xs text-[#007185] hover:underline"
                      >
                        Add {toWholesale} more to unlock wholesale (₵{item.wholesalePrice}/unit)
                      </button>
                    )}

                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      Total: ₵{(item.unitPrice * item.quantity).toFixed(2)}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-2">
                      <button onClick={() => updateQuantity(itemId, 'subtract')} className="rounded-full bg-white px-3 py-1 text-slate-700 hover:bg-slate-100">−</button>
                      <span className="min-w-[2rem] text-center text-sm font-semibold text-slate-900">{item.quantity}</span>
                      <button onClick={() => updateQuantity(itemId, 'add')} className="rounded-full bg-white px-3 py-1 text-slate-700 hover:bg-slate-100">+</button>
                    </div>
                    <button onClick={() => removeItem(itemId)} className="text-sm text-rose-600 transition hover:text-rose-800">Remove</button>
                  </div>
                </div>
              );
            })
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
              {promoMessage.text && (
                <p className={`mt-3 text-sm font-medium ${promoMessage.success ? 'text-emerald-600' : 'text-red-600'}`}>
                  {promoMessage.text}
                </p>
              )}
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

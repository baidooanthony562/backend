import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createOrder, createGuestOrder, validatePromo, initiateMoMoPayment, checkMoMoStatus, initializePaystackPayment } from '../utils/api';
import { getAuthUser, getToken, isAuthenticated } from '../utils/auth';
import { readCart, writeCart, clearCart as clearStoredCart } from '../utils/cart';

function resolveUnitPrice(item) {
  const qty = item.quantity || 1;
  const hasWholesale = item.wholesalePrice && item.wholesaleMinQty;
  if (hasWholesale && qty >= item.wholesaleMinQty) return Number(item.wholesalePrice) || 0;
  return Number(item.retailPrice || item.price || item.unitPrice || 0);
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
  const [paymentMethod, setPaymentMethod] = useState('paystack');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [momoPhone, setMomoPhone] = useState('');
  const [momoStatus, setMomoStatus] = useState(''); // '' | 'pending' | 'success' | 'failed'
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const pollRef = useRef(null);
  const token = getToken();

  useEffect(() => () => clearInterval(pollRef.current), []);

  useEffect(() => {
    const hasId = (item) => !!(item._id || item.id);
    const valid = readCart().filter((item) => item && hasId(item));
    setCartItems(valid.map((item) => ({
      ...item,
      unitPrice: resolveUnitPrice(item),
      category: typeof item.category === 'string' ? item.category : item.category?.name || '',
    })));
  }, []);

  const total = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [cartItems]
  );
  const finalTotal = promoResult ? promoResult.totalAfterDiscount : total;

  const persist = (next) => {
    setCartItems(next);
    writeCart(next);
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

  const whatsappOrder = () => {
    if (cartItems.length === 0) return;
    const lines = cartItems
      .map((item) => `• ${item.quantity}x ${item.name} @ ₵${(item.unitPrice || 0).toFixed(2)}/unit = ₵${((item.unitPrice || 0) * item.quantity).toFixed(2)}`)
      .join('\n');
    const msg = `Hi Cindy Nat! I'd like to place an order:\n\n${lines}\n\nSubtotal: ₵${total.toFixed(2)}${promoResult ? `\nPromo discount: -₵${promoResult.discountAmount.toFixed(2)}` : ''}\nTotal: ₵${finalTotal.toFixed(2)}\n\nPlease confirm availability and payment details. Thank you!`;
    window.open(`https://wa.me/233257543723?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  const buildOrderPayload = (method, momoRef = '') => {
    const isValidId = (id) => /^[a-f\d]{24}$/i.test(id);
    const validItems = cartItems.filter((item) => isValidId(item._id || item.id));
    return {
      orderItems: validItems.map((item) => ({
        product: item._id || item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.unitPrice || 0,
        image: item.image,
      })),
      shippingAddress: shipping,
      paymentMethod: method,
      subtotalPrice: total,
      discountPrice: promoResult ? promoResult.discountAmount : 0,
      promoCode: promoResult ? promoResult.code : '',
      totalPrice: finalTotal,
      momoReference: momoRef,
    };
  };

  const clearCart = () => {
    clearStoredCart();
    setCartItems([]);
    setPromoResult(null);
    setPromoCode('');
  };

  const placeOrder = async (method, momoRef = '') => {
    const { data } = await createOrder(buildOrderPayload(method, momoRef), token);
    clearCart();
    navigate(`/order-confirmation/${data._id}`);
  };

  const placeGuestOrder = async (method) => {
    const payload = { ...buildOrderPayload(method), guestName: guestName.trim(), guestEmail: guestEmail.trim() };
    const { data } = await createGuestOrder(payload);
    clearCart();
    sessionStorage.setItem(`guestOrderToken:${data._id}`, data.guestOrderToken);
    navigate(`/order-confirmation/${data._id}`);
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) { setCheckoutMessage('Add at least one item to complete checkout.'); return; }
    if (!shipping.address || !shipping.city || !shipping.phone) { setCheckoutMessage('Please fill in your shipping address before checkout.'); return; }

    if (!isAuthenticated()) {
      if (!guestName.trim()) { setCheckoutMessage('Please enter your name.'); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim())) { setCheckoutMessage('Please enter a valid email address.'); return; }
    }

    const isValidId = (id) => /^[a-f\d]{24}$/i.test(id);
    if (!cartItems.some((item) => isValidId(item._id || item.id))) {
      setCheckoutMessage('Your cart items are outdated. Please re-add products from the shop.');
      return;
    }

    const isGuest = !isAuthenticated();

    // MTN MoMo flow (guests can't use MoMo — requires auth token for payment API)
    if (paymentMethod === 'momo' && !isGuest) {
      if (!momoPhone.trim()) { setCheckoutMessage('Enter your MTN MoMo phone number.'); return; }
      setPlacingOrder(true);
      setCheckoutMessage('');
      setMomoStatus('pending');
      try {
        const { data } = await initiateMoMoPayment({ phone: momoPhone, amount: finalTotal, externalId: Date.now().toString() }, token);
        const { referenceId } = data;
        let attempts = 0;
        pollRef.current = setInterval(async () => {
          attempts++;
          if (attempts > 20) {
            clearInterval(pollRef.current);
            setMomoStatus('failed');
            setCheckoutMessage('Payment timed out. Please try again.');
            setPlacingOrder(false);
            return;
          }
          try {
            const { data: s } = await checkMoMoStatus(referenceId, token);
            if (s.status === 'SUCCESSFUL') {
              clearInterval(pollRef.current);
              setMomoStatus('success');
              await placeOrder('momo', referenceId);
            } else if (s.status === 'FAILED') {
              clearInterval(pollRef.current);
              setMomoStatus('failed');
              setCheckoutMessage('Payment was declined. Please try again.');
              setPlacingOrder(false);
            }
          } catch { /* keep polling */ }
        }, 3000);
      } catch (err) {
        setMomoStatus('failed');
        setCheckoutMessage(err.response?.data?.message || 'Could not initiate MoMo payment.');
        setPlacingOrder(false);
      }
      return;
    }

    // Paystack flow
    if (paymentMethod === 'paystack') {
      const email = isGuest ? guestEmail.trim() : user?.email;
      if (!email) { setCheckoutMessage('Email is required for Paystack payment.'); return; }
      setPlacingOrder(true);
      setCheckoutMessage('');
      try {
        const { data } = await initializePaystackPayment({ email, amount: finalTotal });
        // Save order data so PaymentVerify can create the order after payment
        sessionStorage.setItem('paystackPending', JSON.stringify({
          orderPayload: isGuest
            ? { ...buildOrderPayload('Paystack'), guestName: guestName.trim(), guestEmail: email }
            : buildOrderPayload('Paystack'),
          isGuest,
        }));
        window.location.href = data.authorization_url;
      } catch (err) {
        setCheckoutMessage(err.response?.data?.message || 'Could not connect to Paystack. Try again.');
        setPlacingOrder(false);
      }
      return;
    }

    // Standard checkout
    setPlacingOrder(true);
    setCheckoutMessage('');
    try {
      if (isGuest) {
        await placeGuestOrder(paymentMethod);
      } else {
        await placeOrder(paymentMethod);
      }
    } catch (err) {
      setCheckoutMessage(err.response?.data?.message || 'Unable to place order.');
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <section className="mx-auto max-w-6xl px-4 pb-32 pt-4 md:px-8 xl:pb-20">
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-gold">Your cart</p>
        <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">Review &amp; Checkout</h1>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.8fr_0.9fr]">
        {/* Cart items */}
        <div className="space-y-2">
          {cartItems.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
              Your cart is empty. <Link to="/shop" className="text-brand-dark underline">Browse products</Link>.
            </div>
          ) : (
            cartItems.map((item) => {
              const itemId = item.id || item._id;
              const hasWholesale = item.wholesalePrice && item.wholesaleMinQty;
              const isWholesale = hasWholesale && item.quantity >= item.wholesaleMinQty;
              const toWholesale = hasWholesale && !isWholesale ? item.wholesaleMinQty - item.quantity : 0;

              return (
                <div key={itemId} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3">
                  <img
                    src={item.image}
                    alt={item.name}
                    loading="lazy"
                    decoding="async"
                    className="h-16 w-16 shrink-0 rounded-lg object-cover sm:h-20 sm:w-20"
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80'; }}
                  />
                  <div className="flex flex-1 flex-col min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-sm font-semibold text-slate-900 line-clamp-2 sm:text-base">{item.name}</h2>
                      <button onClick={() => removeItem(itemId)} className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500"><i className="fas fa-times"></i></button>
                    </div>
                    <p className="text-xs text-slate-500">{typeof item.category === 'string' ? item.category : item.category?.name || 'Product'}</p>
                    {isWholesale && (
                      <span className="mt-0.5 w-fit rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Wholesale</span>
                    )}
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div>
                        <p className={`text-sm font-bold ${isWholesale ? 'text-emerald-600' : 'text-slate-900'}`}>
                          ₵{((item.unitPrice || 0) * item.quantity).toFixed(2)}
                        </p>
                        <p className="text-[10px] text-slate-400">₵{(item.unitPrice || 0).toFixed(2)}/unit</p>
                      </div>
                      <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1">
                        <button onClick={() => updateQuantity(itemId, 'subtract')} className="rounded px-1.5 text-sm font-bold text-slate-700 hover:bg-slate-200">−</button>
                        <span className="min-w-[1.5rem] text-center text-xs font-semibold text-slate-900">{item.quantity}</span>
                        <button onClick={() => updateQuantity(itemId, 'add')} className="rounded px-1.5 text-sm font-bold text-slate-700 hover:bg-slate-200">+</button>
                      </div>
                    </div>
                    {toWholesale > 0 && (
                      <button onClick={() => updateQuantity(itemId, 'add')} className="mt-1 text-left text-[10px] text-[#007185] hover:underline">
                        Add {toWholesale} more for wholesale price (₵{item.wholesalePrice}/unit)
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Order summary */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-base font-bold text-slate-900">Order Summary</h2>
          <div className="mt-3 space-y-2">
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
              <span>Free over ₵5,000</span>
            </div>
            <div className="border-t border-slate-200 pt-3 text-base font-bold text-slate-900 sm:text-lg">
              <span>Total</span>
              <span className="float-right">₵{finalTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {!isAuthenticated() && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="mb-2 text-sm font-semibold text-amber-800">Checking out as guest</p>
                <input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-gold"
                />
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="Email (for order confirmation)"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-gold"
                />
                <p className="mt-2 text-xs text-amber-700">
                  Have an account? <Link to="/login?redirect=/cart" className="font-semibold underline">Sign in</Link> to track orders and use MoMo.
                </p>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <label className="block text-sm font-medium text-slate-700">Shipping address</label>
              <input
                value={shipping.address}
                onChange={(e) => setShipping({ ...shipping, address: e.target.value })}
                placeholder="Street address"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-gold"
              />
              <input
                value={shipping.city}
                onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
                placeholder="City"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-gold"
              />
              <input
                value={shipping.phone}
                onChange={(e) => setShipping({ ...shipping, phone: e.target.value })}
                placeholder="Phone number"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-gold"
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <label className="block text-sm font-medium text-slate-700">Payment method</label>
              <select
                value={paymentMethod}
                onChange={(e) => { setPaymentMethod(e.target.value); setMomoStatus(''); setCheckoutMessage(''); }}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-gold"
              >
                <option value="paystack">Pay Online (Card / MoMo) — Paystack</option>
                {isAuthenticated() && <option value="momo">MTN MoMo (Direct)</option>}
                <option value="bank-transfer">Bank Transfer</option>
                <option value="cash-on-delivery">Cash on Delivery</option>
              </select>

              {paymentMethod === 'momo' && (
                <div className="mt-2 space-y-2">
                  <input
                    value={momoPhone}
                    onChange={(e) => setMomoPhone(e.target.value)}
                    placeholder="MoMo number e.g. 0241234567"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-gold"
                  />
                  {momoStatus === 'pending' && (
                    <div className="flex items-center gap-3 rounded-2xl bg-yellow-50 px-3 py-2.5 text-sm text-yellow-800">
                      <svg className="h-5 w-5 animate-spin text-yellow-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      <span>Waiting for MoMo approval on your phone...</span>
                    </div>
                  )}
                  {momoStatus === 'success' && (
                    <div className="rounded-2xl bg-green-50 px-3 py-2.5 text-sm font-semibold text-green-700">
                      <i className="fas fa-check mr-1"></i> Payment confirmed! Creating your order...
                    </div>
                  )}
                  {momoStatus === 'failed' && (
                    <div className="rounded-2xl bg-red-50 px-3 py-2.5 text-sm text-red-700">
                      Payment failed or was declined.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <label className="block text-sm font-medium text-slate-700">Promo code</label>
              <div className="mt-2 flex gap-2">
                <input
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Enter code"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-gold"
                />
                <button onClick={applyPromo} disabled={applying} className="rounded-full bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">
                  Apply
                </button>
              </div>
              {promoMessage.text && (
                <p className={`mt-2 text-xs font-medium ${promoMessage.success ? 'text-emerald-600' : 'text-red-600'}`}>
                  {promoMessage.text}
                </p>
              )}
            </div>

            <button onClick={handleCheckout} disabled={placingOrder || momoStatus === 'pending'} className={`w-full rounded-full px-6 py-3 text-sm font-semibold transition disabled:opacity-60 ${paymentMethod === 'paystack' ? 'bg-[#0BA4DB] text-white hover:bg-[#0993c5]' : 'bg-brand-dark text-white hover:bg-slate-800'}`}>
              {momoStatus === 'pending' ? 'Awaiting MoMo approval...' : placingOrder ? (paymentMethod === 'paystack' ? 'Redirecting to Paystack...' : 'Placing order...') : paymentMethod === 'paystack' ? 'Pay securely with Paystack' : paymentMethod === 'momo' ? 'Pay with MoMo' : 'Proceed to checkout'}
            </button>
            <button
              onClick={whatsappOrder}
              disabled={cartItems.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-green-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Order via WhatsApp
            </button>
            {checkoutMessage && (
              <div className="rounded-2xl bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">
                {checkoutMessage}
              </div>
            )}
          </div>
          <p className="mt-4 text-xs text-slate-500">Secure support available through our live chat while you check out.</p>
        </div>
      </div>

      {/* Sticky checkout bar — mobile only */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white px-4 py-3 shadow-xl xl:hidden">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-500">{cartItems.length} item{cartItems.length !== 1 ? 's' : ''}</p>
              <p className="text-base font-bold text-slate-900">₵{finalTotal.toFixed(2)}</p>
            </div>
            <button
              onClick={whatsappOrder}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-green-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-green-700"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </button>
            <button
              onClick={handleCheckout}
              disabled={placingOrder || momoStatus === 'pending'}
              className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60 ${paymentMethod === 'paystack' ? 'bg-[#0BA4DB] hover:bg-[#0993c5]' : 'bg-brand-dark hover:bg-slate-800'}`}
            >
              {placingOrder || momoStatus === 'pending' ? 'Processing...' : paymentMethod === 'paystack' ? 'Pay' : 'Checkout'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

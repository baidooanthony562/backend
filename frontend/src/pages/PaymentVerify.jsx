import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { finalizePaystackOrder, verifyPaystackPayment, createOrder, createGuestOrder } from '../utils/api';
import { getToken } from '../utils/auth';
import { clearCart } from '../utils/cart';

export default function PaymentVerify() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = getToken();
  const [status, setStatus] = useState('verifying'); // verifying | success | failed
  const [message, setMessage] = useState('');
  // When true, the charge likely succeeded but order creation didn't — keep the
  // fallback details so the customer can retry instead of losing a paid order.
  const [retryable, setRetryable] = useState(false);
  const referenceRef = useRef(null);

  const completeSuccess = (order) => {
    if (order?.guestOrderToken) {
      sessionStorage.setItem(`guestOrderToken:${order._id}`, order.guestOrderToken);
    }
    clearCart();
    sessionStorage.removeItem('paystackPending');
    setStatus('success');
    setTimeout(() => navigate(`/order-confirmation/${order._id}`), 1200);
  };

  // Fallback for when the server has no saved intent (older checkout, or the
  // intent failed to save at init): create the order from the browser's copy.
  const tryClientSideCreate = async (reference) => {
    const pending = sessionStorage.getItem('paystackPending');
    if (!pending) return null;
    let orderPayload, isGuest;
    try {
      ({ orderPayload, isGuest } = JSON.parse(pending));
    } catch {
      return null;
    }
    await verifyPaystackPayment(reference);
    if (isGuest) {
      const { data } = await createGuestOrder({ ...orderPayload, paystackReference: reference });
      return data;
    }
    const { data } = await createOrder({ ...orderPayload, paystackReference: reference }, token);
    return data;
  };

  const finalize = async () => {
    const reference = referenceRef.current;
    setStatus('verifying');
    setRetryable(false);

    try {
      // Primary path: the server already holds the order intent (saved at init),
      // and the webhook may have finalized it already. This call is idempotent.
      const { data } = await finalizePaystackOrder(reference);
      completeSuccess(data);
      return;
    } catch (err) {
      const httpStatus = err.response?.status;
      const serverMsg = err.response?.data?.message || '';

      // No server-side intent → fall back to creating it from the browser's copy.
      if (httpStatus === 404) {
        try {
          const order = await tryClientSideCreate(reference);
          if (order) {
            completeSuccess(order);
            return;
          }
        } catch (fallbackErr) {
          const fbMsg = fallbackErr.response?.data?.message || '';
          if (/already been used/i.test(fbMsg)) {
            clearCart();
            sessionStorage.removeItem('paystackPending');
            setStatus('failed');
            setMessage('Good news — your order was already created from this payment. Check your email or your order history; there is no need to pay again.');
            return;
          }
        }
      }

      // Payment likely went through but the order didn't save. Keep details so
      // the customer can retry, and surface the reference for support.
      setStatus('failed');
      setRetryable(true);
      setMessage(
        `${serverMsg || "We couldn't finish creating your order."} Your payment reference is ${reference}. You can retry below, or send that reference to support and we'll complete your order.`
      );
    }
  };

  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref');
    referenceRef.current = reference;
    if (!reference) {
      setStatus('failed');
      setMessage('No payment reference found.');
      return;
    }
    finalize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="mx-auto max-w-lg px-4 pb-24 pt-16 md:px-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        {status === 'verifying' && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
              <svg className="h-8 w-8 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900">Confirming your payment...</h1>
            <p className="mt-2 text-sm text-slate-500">Please wait while we verify your payment and create your order.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-600">
              <i className="fas fa-check"></i>
            </div>
            <h1 className="text-xl font-bold text-green-800">Payment successful!</h1>
            <p className="mt-2 text-sm text-slate-500">Redirecting to your order confirmation...</p>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl text-red-600">
              <i className="fas fa-times"></i>
            </div>
            <h1 className="text-xl font-bold text-red-800">Something went wrong</h1>
            <p className="mt-2 text-sm text-slate-600">{message}</p>
            <div className="mt-6 flex flex-col gap-3">
              {retryable && (
                <button
                  onClick={finalize}
                  className="w-full rounded-full bg-green-600 px-6 py-3 text-sm font-semibold text-white hover:bg-green-700 transition"
                >
                  Retry creating my order
                </button>
              )}
              <button
                onClick={() => navigate('/cart')}
                className="w-full rounded-full bg-brand-gold px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-yellow-400 transition"
              >
                Back to cart
              </button>
              <a
                href="https://wa.me/233257543723"
                target="_blank"
                rel="noreferrer"
                className="w-full rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 hover:border-brand-gold transition text-center"
              >
                Contact support on WhatsApp
              </a>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { verifyPaystackPayment, createOrder, createGuestOrder } from '../utils/api';
import { getToken, isAuthenticated } from '../utils/auth';
import { clearCart } from '../utils/cart';

export default function PaymentVerify() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = getToken();
  const [status, setStatus] = useState('verifying'); // verifying | success | failed
  const [message, setMessage] = useState('');

  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref');

    const run = async () => {
      if (!reference) {
        setStatus('failed');
        setMessage('No payment reference found.');
        return;
      }

      const pending = sessionStorage.getItem('paystackPending');
      if (!pending) {
        setStatus('failed');
        setMessage('Order data not found. Your payment may have gone through — please contact support.');
        return;
      }

      const { orderPayload, isGuest } = JSON.parse(pending);

      try {
        // Verify with Paystack via backend
        await verifyPaystackPayment(reference);

        // Create the order
        let orderId;
        if (isGuest) {
          const { data } = await createGuestOrder({ ...orderPayload, paystackReference: reference });
          orderId = data._id;
          sessionStorage.setItem(`guestOrderToken:${orderId}`, data.guestOrderToken);
        } else {
          const { data } = await createOrder({ ...orderPayload, paystackReference: reference }, token);
          orderId = data._id;
        }

        // Clear cart and pending data
        clearCart();
        sessionStorage.removeItem('paystackPending');

        setStatus('success');
        setTimeout(() => navigate(`/order-confirmation/${orderId}`), 1200);
      } catch (err) {
        setStatus('failed');
        setMessage(err.response?.data?.message || 'Payment verification failed. Please contact support.');
        sessionStorage.removeItem('paystackPending');
      }
    };

    run();
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

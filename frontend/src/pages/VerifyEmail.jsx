import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { verifyEmail } from '../utils/api';

export default function VerifyEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    verifyEmail(token)
      .then(({ data }) => {
        setMessage(data.message);
        setStatus('success');
      })
      .catch((err) => {
        setMessage(err.response?.data?.message || 'Verification failed. The link may have expired.');
        setStatus('error');
      });
  }, [token]);

  return (
    <section className="mx-auto max-w-md px-4 pb-24 pt-16 md:px-0">
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        {status === 'loading' && (
          <>
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-brand-gold border-t-transparent" />
            <p className="text-slate-600">Verifying your email...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
              ✅
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">Email Verified!</h1>
            <p className="mt-2 text-slate-500">{message}</p>
            <Link
              to="/login"
              className="mt-6 inline-block rounded-full bg-brand-gold px-8 py-3 text-sm font-extrabold text-black transition hover:bg-yellow-400"
            >
              Sign In
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl">
              ❌
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">Verification Failed</h1>
            <p className="mt-2 text-slate-500">{message}</p>
            <Link
              to="/login"
              className="mt-6 inline-block rounded-full bg-brand-gold px-8 py-3 text-sm font-extrabold text-black transition hover:bg-yellow-400"
            >
              Back to Login
            </Link>
          </>
        )}
      </div>
    </section>
  );
}

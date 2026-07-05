import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getConsent, setConsent, loadGA } from '../utils/analytics';

// Shown once until the visitor chooses. "Accept" starts Google Analytics;
// "Decline" leaves only the essential login/cart storage running.
export default function CookieConsent() {
  const [visible, setVisible] = useState(() => !getConsent());
  if (!visible) return null;

  const accept = () => { setConsent('accepted'); loadGA(); setVisible(false); };
  const decline = () => { setConsent('declined'); setVisible(false); };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-white/10 bg-[#131921] px-4 py-4 text-slate-200 shadow-2xl">
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed">
          We use essential cookies to keep you signed in and remember your cart. With your permission we also use
          {' '}<strong className="text-white">Google Analytics</strong> to understand how the site is used.{' '}
          <Link to="/privacy-policy" className="font-semibold text-brand-gold underline underline-offset-2">Learn more</Link>.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={decline}
            className="rounded-full border border-white/25 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="rounded-full bg-brand-gold px-5 py-2 text-sm font-extrabold text-black transition hover:bg-yellow-400"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

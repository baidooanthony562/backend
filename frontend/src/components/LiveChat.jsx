import { useState } from 'react';
import { getAuthUser } from '../utils/auth';
import { sendSupportMessage } from '../utils/api';

const MAX_MESSAGE_LEN = 2000;
const WHATSAPP_NUMBER = '233257543723';

export default function LiveChat() {
  const user = getAuthUser();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState([
    { from: 'agent', text: 'Hi! Need help with an order, review, or product selection? Send a message and we will reply by email — or chat with us instantly on WhatsApp.' },
  ]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const trimmed = message.trim();
  const remaining = MAX_MESSAGE_LEN - message.length;
  const overLimit = remaining < 0;
  const canSend = trimmed.length > 0 && !overLimit && !sending;

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    setError('');
    setHistory((prev) => [...prev, { from: 'user', text: trimmed }]);

    try {
      const { data } = await sendSupportMessage({
        name: user?.name,
        email: user?.email,
        message: trimmed,
      });
      setHistory((prev) => [...prev, { from: 'agent', text: data.response }]);
      setMessage('');
    } catch {
      setError('Unable to send right now. Please try WhatsApp or try again in a moment.');
      setHistory((prev) => [...prev, { from: 'agent', text: 'We could not send your message right now. Please try again later or reach us on WhatsApp.' }]);
    } finally {
      setSending(false);
    }
  };

  const openWhatsApp = () => {
    const prefill = trimmed || `Hi Cindy Nat, I have a question${user?.name ? ` — this is ${user.name}` : ''}.`;
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(prefill)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed bottom-20 right-4 z-50 sm:bottom-6 sm:right-6">
      <div className="flex justify-end">
        <button
          className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-dark text-base font-semibold text-white shadow-lg transition hover:bg-slate-800 sm:h-auto sm:w-auto sm:gap-2 sm:px-4 sm:py-3 sm:text-sm"
          onClick={() => setOpen((prev) => !prev)}
          aria-label={open ? 'Close live chat' : 'Open live support chat'}
        >
          <i className={open ? 'fas fa-times' : 'fas fa-comment-alt'}></i>
          <span className="hidden sm:inline">{open ? 'Close' : 'Live support'}</span>
        </button>
      </div>

      {open && (
        <div className="mt-2 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:mt-3 sm:rounded-3xl">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-base font-semibold text-slate-900">Support</p>
              <p className="text-xs text-slate-500">Typically replies within a few hours.</p>
            </div>
          </div>

          {/* WhatsApp — fastest path; opens in a new tab with the typed message pre-filled. */}
          <button
            type="button"
            onClick={openWhatsApp}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-full bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
          >
            <i className="fab fa-whatsapp text-base"></i>
            Chat on WhatsApp
          </button>

          <div className="mb-3 flex items-center gap-3 text-[11px] uppercase tracking-widest text-slate-400">
            <span className="h-px flex-1 bg-slate-200"></span>
            or send a message
            <span className="h-px flex-1 bg-slate-200"></span>
          </div>

          <div className="max-h-60 space-y-3 overflow-y-auto pr-2 pb-2 text-sm text-slate-700">
            {history.map((item, index) => (
              <div
                key={`${item.from}-${index}`}
                className={item.from === 'agent' ? 'rounded-3xl bg-slate-100 p-3' : 'rounded-3xl bg-brand-gold p-3 text-black'}
              >
                {item.text}
              </div>
            ))}
          </div>

          {error && <div className="mt-3 rounded-3xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

          <div className="mt-4">
            <textarea
              rows="3"
              value={message}
              maxLength={MAX_MESSAGE_LEN + 100}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={user?.name ? `Hi ${user.name.split(' ')[0]}, how can we help?` : 'Type your question here...'}
              className={`w-full rounded-3xl border p-3 text-sm outline-none focus:border-brand-gold ${overLimit ? 'border-rose-400' : 'border-slate-200'}`}
            />
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className={overLimit ? 'text-rose-600' : 'text-slate-400'}>
                {overLimit ? `${Math.abs(remaining)} over limit` : `${remaining} characters left`}
              </span>
              {!user?.email && (
                <span className="text-slate-400">We will reply on WhatsApp if no email.</span>
              )}
            </div>
            <button
              onClick={handleSend}
              disabled={!canSend}
              className="mt-3 w-full rounded-full bg-brand-dark px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? 'Sending…' : 'Send message'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAuthUser } from '../utils/auth';
import { sendSupportMessage, fetchMySupportThread } from '../utils/api';

const MAX_MESSAGE_LEN = 2000;
const WHATSAPP_NUMBER = '233257543723';

export default function LiveChat() {
  const user = getAuthUser();
  const isSignedIn = Boolean(user);

  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [thread, setThread] = useState(null); // server-backed conversation for signed-in users
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scrollerRef = useRef(null);

  const trimmed = message.trim();
  const remaining = MAX_MESSAGE_LEN - message.length;
  const overLimit = remaining < 0;
  const canSend = trimmed.length > 0 && !overLimit && !sending && isSignedIn;

  // Fetch the customer's thread when the widget opens, so they see any
  // replies the admin sent since their last visit.
  useEffect(() => {
    if (!open || !isSignedIn) return;
    let cancelled = false;
    setLoadingThread(true);
    fetchMySupportThread()
      .then((res) => { if (!cancelled) setThread(res.data); })
      .catch(() => { if (!cancelled) setThread(null); })
      .finally(() => { if (!cancelled) setLoadingThread(false); });
    return () => { cancelled = true; };
  }, [open, isSignedIn]);

  // Auto-scroll to the newest message whenever the thread updates.
  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [thread?.messages?.length, loadingThread]);

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    setError('');
    const text = trimmed;
    // Optimistic — show the customer's message immediately so the UI feels live.
    setThread((prev) => {
      const base = prev || { messages: [], status: 'pending' };
      return { ...base, messages: [...(base.messages || []), { from: 'customer', text, createdAt: new Date().toISOString() }] };
    });
    setMessage('');
    try {
      const { data } = await sendSupportMessage({ message: text });
      setThread(data); // replace with server truth (includes _id, ordering, etc.)
    } catch {
      setError('Unable to send right now. Please try WhatsApp or try again in a moment.');
    } finally {
      setSending(false);
    }
  };

  const openWhatsApp = () => {
    const prefill = trimmed || `Hi Cindy Nat, I have a question${user?.name ? ` — this is ${user.name}` : ''}.`;
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(prefill)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const messages = thread?.messages || [];

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
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-slate-900">Support</p>
              <p className="text-xs text-slate-500">Typically replies within a few hours.</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close support chat"
              className="-mr-1 -mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          {/* WhatsApp — always available, even for signed-out visitors. */}
          <button
            type="button"
            onClick={openWhatsApp}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-full bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
          >
            <i className="fab fa-whatsapp text-base"></i>
            Chat on WhatsApp
          </button>

          {!isSignedIn ? (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-800">Sign in to chat with us in-app.</p>
              <p className="mt-1 text-xs">In-app chat keeps your conversation history with our team. If you'd rather not sign in, message us on WhatsApp above.</p>
              <Link to="/login" className="mt-3 inline-flex items-center gap-1 rounded-full bg-brand-dark px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800">
                Sign in <i className="fas fa-arrow-right text-[10px]"></i>
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center gap-3 text-[11px] uppercase tracking-widest text-slate-400">
                <span className="h-px flex-1 bg-slate-200"></span>
                or message our team
                <span className="h-px flex-1 bg-slate-200"></span>
              </div>

              <div ref={scrollerRef} className="max-h-60 space-y-3 overflow-y-auto pr-2 pb-2 text-sm text-slate-700">
                {loadingThread ? (
                  <div className="rounded-3xl bg-slate-100 p-3 text-slate-500">Loading conversation…</div>
                ) : messages.length === 0 ? (
                  <div className="rounded-3xl bg-slate-100 p-3">
                    Hi {user.name?.split(' ')[0] || 'there'} — send us a message about an order, product or anything else. We'll reply right here.
                  </div>
                ) : (
                  messages.map((m, i) => (
                    <div
                      key={m._id || `${m.createdAt}-${i}`}
                      className={m.from === 'admin' ? 'rounded-3xl bg-slate-100 p-3' : 'ml-auto max-w-[85%] rounded-3xl bg-brand-gold p-3 text-black'}
                    >
                      <p className="whitespace-pre-wrap">{m.text}</p>
                      {m.from === 'admin' && (
                        <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-500">Cindy Nat support</p>
                      )}
                    </div>
                  ))
                )}
              </div>

              {error && <div className="mt-3 rounded-3xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

              <div className="mt-4">
                <textarea
                  rows="3"
                  value={message}
                  maxLength={MAX_MESSAGE_LEN + 100}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={`Hi ${user.name?.split(' ')[0] || 'there'}, how can we help?`}
                  className={`w-full rounded-3xl border p-3 text-sm outline-none focus:border-brand-gold ${overLimit ? 'border-rose-400' : 'border-slate-200'}`}
                />
                <div className="mt-1 flex items-center justify-between text-[11px]">
                  <span className={overLimit ? 'text-rose-600' : 'text-slate-400'}>
                    {overLimit ? `${Math.abs(remaining)} over limit` : `${remaining} characters left`}
                  </span>
                  <span className="text-slate-400">Enter to send · Shift+Enter for newline</span>
                </div>
                <button
                  onClick={handleSend}
                  disabled={!canSend}
                  className="mt-3 w-full rounded-full bg-brand-dark px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending ? 'Sending…' : 'Send message'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

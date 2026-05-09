import { useState } from 'react';
import { getAuthUser } from '../utils/auth';
import { sendSupportMessage } from '../utils/api';

export default function LiveChat() {
  const user = getAuthUser();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState([
    { from: 'agent', text: 'Hi! Need help with an order, review, or product selection? Send a message to our support team.' },
  ]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    setError('');
    const nextHistory = [...history, { from: 'user', text: message.trim() }];
    setHistory(nextHistory);

    try {
      const { data } = await sendSupportMessage({
        name: user?.name,
        email: user?.email,
        message: message.trim(),
      });
      setHistory((prev) => [...prev, { from: 'agent', text: data.response }]);
      setMessage('');
    } catch (err) {
      setError('Unable to send message. Please try again later.');
      setHistory((prev) => [...prev, { from: 'agent', text: 'We could not send your message right now. Please try again later.' }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm">
      <div className="flex justify-end">
        <button
          className="inline-flex items-center gap-2 rounded-full bg-brand-dark px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800"
          onClick={() => setOpen((prev) => !prev)}
        >
          {open ? 'Close chat' : 'Live support'}
        </button>
      </div>
      {open && (
        <div className="mt-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-base font-semibold text-slate-900">Live chat support</p>
              <p className="text-sm text-slate-500">Message our support team directly.</p>
            </div>
          </div>
          <div className="max-h-72 space-y-3 overflow-y-auto pr-2 pb-2 text-sm text-slate-700">
            {history.map((item, index) => (
              <div key={`${item.from}-${index}`} className={item.from === 'agent' ? 'rounded-3xl bg-slate-100 p-3' : 'rounded-3xl bg-brand-gold p-3 text-black'}>
                {item.text}
              </div>
            ))}
          </div>
          {error && <div className="mt-3 rounded-3xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
          <div className="mt-4">
            <textarea
              rows="3"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your question here..."
              className="w-full rounded-3xl border border-slate-200 p-3 text-sm outline-none focus:border-brand-gold"
            />
            <button
              onClick={handleSend}
              disabled={sending}
              className="mt-3 w-full rounded-full bg-brand-dark px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? 'Sending...' : 'Send message'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

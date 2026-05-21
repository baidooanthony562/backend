import { useEffect, useState } from 'react';

const TOAST_EVENT = 'cindyToast';

export function showToast(message, type = 'success') {
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { message, type } }));
}

export default function Toast() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handler = (e) => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, ...e.detail }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
    };
    window.addEventListener(TOAST_EVENT, handler);
    return () => window.removeEventListener(TOAST_EVENT, handler);
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-6 right-4 z-[9999] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 rounded-xl px-5 py-3 text-sm font-semibold shadow-xl transition-all animate-fade-in ${
            t.type === 'error' ? 'bg-red-600 text-white' : 'bg-[#131921] text-white'
          }`}
        >
          <i className={t.type === 'error' ? 'fas fa-exclamation-triangle' : 'fas fa-check'}></i>
          {t.message}
        </div>
      ))}
    </div>
  );
}

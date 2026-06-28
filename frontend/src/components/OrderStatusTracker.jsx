// Visual order progress for the customer's order detail page. Renders the
// Pending → Processing → Shipped → Delivered timeline with the current step
// highlighted, or a distinct "Cancelled" state.

const STEPS = ['Pending', 'Processing', 'Shipped', 'Delivered'];

const STEP_ICONS = {
  Pending:    'fas fa-clock',
  Processing: 'fas fa-box',
  Shipped:    'fas fa-truck',
  Delivered:  'fas fa-check-circle',
};

const STEP_DESC = {
  Pending:    'Order received, awaiting confirmation',
  Processing: 'Your order is being packed',
  Shipped:    'On the way to you',
  Delivered:  'Delivered successfully',
};

export default function OrderStatusTracker({ status }) {
  const isCancelled = status === 'Cancelled' || status === 'Refunded';
  const currentIndex = STEPS.indexOf(status);

  if (isCancelled) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
        <i className="fas fa-times-circle text-2xl text-red-600"></i>
        <div>
          <p className="font-bold text-red-800">Order {status === 'Refunded' ? 'Refunded' : 'Cancelled'}</p>
          <p className="text-sm text-red-600">This order is no longer active.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="mb-6 text-base font-bold text-slate-900">Order Status</h2>
      <div className="relative">
        {/* Progress line */}
        <div className="absolute left-5 top-5 h-[calc(100%-2.5rem)] w-0.5 bg-slate-200" />
        <div
          className="absolute left-5 top-5 w-0.5 bg-green-500 transition-all duration-500"
          style={{ height: currentIndex <= 0 ? 0 : `${(currentIndex / (STEPS.length - 1)) * 100}%` }}
        />

        <div className="space-y-6">
          {STEPS.map((step, i) => {
            const done = i < currentIndex;
            const active = i === currentIndex;
            return (
              <div key={step} className="relative flex items-start gap-4 pl-14">
                {/* Circle */}
                <div className={`absolute left-0 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-lg transition-all ${
                  done    ? 'border-green-500 bg-green-500 text-white' :
                  active  ? 'border-brand-gold bg-white shadow-md' :
                            'border-slate-200 bg-white text-slate-300'
                }`}>
                  {done ? <i className="fas fa-check" /> : <i className={STEP_ICONS[step]} />}
                </div>
                <div className={active ? '' : done ? 'opacity-70' : 'opacity-40'}>
                  <p className={`font-semibold ${active ? 'text-slate-900' : 'text-slate-700'}`}>{step}</p>
                  <p className="text-xs text-slate-500">{STEP_DESC[step]}</p>
                  {active && (
                    <span className="mt-1 inline-block rounded-full bg-brand-gold px-2 py-0.5 text-xs font-bold text-black">
                      Current status
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

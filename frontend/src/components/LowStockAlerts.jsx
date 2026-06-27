import { LOW_STOCK_THRESHOLD } from '../utils/constants';

// Admin overview panel: shows which products need reordering. An empty product
// list is reported explicitly rather than as "well stocked", so a catalogue
// that failed to load can't masquerade as a clean bill of health.
export default function LowStockAlerts({ products = [], threshold = LOW_STOCK_THRESHOLD }) {
  const low = products.filter((p) => Number(p.stock) <= threshold);

  let body;
  if (products.length === 0) {
    body = <p className="text-sm text-slate-500">No products loaded yet — add a product or check that the catalogue is reachable.</p>;
  } else if (low.length === 0) {
    body = <p className="text-sm text-slate-500">All products are well stocked.</p>;
  } else {
    body = (
      <div className="space-y-3">
        {low.map((p) => (
          <div key={p._id || p.id} className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-3">
            <p className="font-semibold text-red-800">{p.name}</p>
            <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">{p.stock} left</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-bold text-slate-900"><i className="fas fa-exclamation-triangle text-red-500 mr-1"></i> Low Stock Alerts</h2>
      {body}
    </div>
  );
}

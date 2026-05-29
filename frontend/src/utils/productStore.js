// Lightweight client cache for the admin-managed product list. Used so the
// catalogue, admin grid and detail page can render instantly from the
// last-seen-good list while the backend re-fetches.
//
// IMPORTANT: this no longer falls back to a hardcoded sample catalogue when
// the cache is empty. Showing fake products to a real shopper (which is
// exactly what happened when the backend was slow on first visit) would let
// them try to buy items we do not actually sell. An empty list lets the
// calling page render its own "loading" / "no products yet" state.

const KEY = 'cindy_products';
const EVENT = 'cindyProductsChanged';

export function getProducts() {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [];
}

export function saveProducts(products) {
  localStorage.setItem(KEY, JSON.stringify(products));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function upsertProduct(product) {
  const products = getProducts();
  const id = product.id || product._id;
  const idx = products.findIndex((p) => (p.id || p._id) === id);
  let updated;
  if (idx >= 0) {
    updated = products.map((p, i) => (i === idx ? { ...p, ...product } : p));
  } else {
    const newId = `p${Date.now()}`;
    updated = [...products, { ...product, id: newId, _id: newId }];
  }
  saveProducts(updated);
  return updated;
}

export function removeProduct(id) {
  const updated = getProducts().filter((p) => p.id !== id && p._id !== id);
  saveProducts(updated);
  return updated;
}

export function onProductsChange(handler) {
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

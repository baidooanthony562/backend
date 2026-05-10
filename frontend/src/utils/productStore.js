import { featuredProducts as staticProducts } from '../data/products';

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
  return staticProducts;
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

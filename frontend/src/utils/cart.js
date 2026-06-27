// The cart lives in localStorage as a JSON array. Both ends are guarded:
//   - readCart() self-heals a corrupt stored value to an empty cart.
//   - writeCart() falls back to in-memory storage when the browser is
//     blocking writes (private mode, "Block all cookies", etc.), so
//     add-to-cart still works for the rest of the session.

let inMemoryFallback = null; // null until persistent storage fails once

export function readCart() {
  if (inMemoryFallback !== null) return inMemoryFallback;
  try {
    const parsed = JSON.parse(localStorage.getItem('cart') || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    try { localStorage.removeItem('cart'); } catch { /* storage blocked */ }
    return [];
  }
}

export function writeCart(items) {
  try {
    localStorage.setItem('cart', JSON.stringify(items));
    inMemoryFallback = null;
  } catch {
    // Storage is blocked or full — keep the cart in memory for this session
    inMemoryFallback = items;
  }
  window.dispatchEvent(new Event('storage'));
}

export function clearCart() {
  try { localStorage.removeItem('cart'); } catch { /* storage blocked */ }
  inMemoryFallback = null;
  window.dispatchEvent(new Event('storage'));
}

export function getCartCount() {
  return readCart().reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
}

// Add a product to the cart (or bump its quantity if already there), in the
// shape the cart/checkout pages expect. Shared by the product card and the
// wishlist so the item shape stays in one place. Pricing here is display-only —
// the server re-prices every order.
export function addProductToCart(product, qty = 1) {
  const id = product._id || product.id;
  const image = product.images?.[0] || product.image || '';
  const hasWholesale = product.wholesalePrice && product.wholesaleMinQty;
  const isWholesale = Boolean(hasWholesale && qty >= product.wholesaleMinQty);
  const unitPrice = isWholesale ? Number(product.wholesalePrice) : Number(product.price) || 0;

  const cart = readCart();
  const existing = cart.find((item) => (item.id || item._id) === id);
  if (existing) {
    existing.quantity += qty;
    existing.unitPrice = unitPrice;
    existing.isWholesale = isWholesale;
  } else {
    cart.push({
      ...product,
      id,
      image,
      quantity: qty,
      unitPrice,
      retailPrice: product.price,
      wholesalePrice: product.wholesalePrice,
      wholesaleMinQty: product.wholesaleMinQty,
      isWholesale,
      category: typeof product.category === 'string' ? product.category : product.category?.name || '',
    });
  }
  writeCart(cart);
  return cart;
}

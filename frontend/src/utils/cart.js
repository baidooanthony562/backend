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

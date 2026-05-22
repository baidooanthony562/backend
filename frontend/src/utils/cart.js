// The cart is a JSON array in localStorage. Reads are guarded so a
// corrupt value can never break add-to-cart — it self-heals to an
// empty cart instead of throwing.
export function readCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem('cart') || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    localStorage.removeItem('cart');
    return [];
  }
}

export function writeCart(items) {
  localStorage.setItem('cart', JSON.stringify(items));
  window.dispatchEvent(new Event('storage'));
}

export function getCartCount() {
  return readCart().reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
}

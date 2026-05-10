const KEY = 'cindy_wishlist';

export function getWishlist() {
  return JSON.parse(localStorage.getItem(KEY) || '[]');
}

export function isInWishlist(id) {
  return getWishlist().some((p) => (p._id || p.id) === id);
}

export function addToWishlist(product) {
  const list = getWishlist();
  const id = product._id || product.id;
  if (list.some((p) => (p._id || p.id) === id)) return list;
  const next = [...list, product];
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function removeFromWishlist(id) {
  const next = getWishlist().filter((p) => (p._id || p.id) !== id);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

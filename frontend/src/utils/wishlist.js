// Wishlist storage. localStorage is the synchronous "view" the UI reads from so
// toggles feel instant; for signed-in users it's mirrored to their account via
// the backend (cross-device, survives a cache clear). Guests just use the local
// copy. On login the local items are merged up to the account so nothing saved
// before signing in is lost.

import { getAuthUser } from './auth';
import { fetchWishlist, addWishlistItem, removeWishlistItem } from './api';

const KEY = 'cindy_wishlist';
const EVENT = 'cindyWishlistChanged';

const isObjectId = (id) => /^[a-f\d]{24}$/i.test(String(id));
const idOf = (p) => p._id || p.id;

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function write(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVENT));
}

// Server returns populated product docs; give them the id/image shape the UI
// already expects from locally-added items.
function fromServer(products) {
  return products.map((p) => ({ ...p, id: p._id || p.id, image: p.images?.[0] || p.image || '' }));
}

export function getWishlist() {
  return read();
}

export function isInWishlist(id) {
  return read().some((p) => idOf(p) === id);
}

export function addToWishlist(product) {
  const list = read();
  const id = idOf(product);
  if (list.some((p) => idOf(p) === id)) return list;
  const next = [...list, product];
  write(next);
  // Mirror to the account in the background; failures don't block the UI.
  if (getAuthUser() && isObjectId(id)) addWishlistItem(id).catch(() => {});
  return next;
}

export function removeFromWishlist(id) {
  const next = read().filter((p) => idOf(p) !== id);
  write(next);
  if (getAuthUser() && isObjectId(id)) removeWishlistItem(id).catch(() => {});
  return next;
}

export function clearLocalWishlist() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}

export function onWishlistChange(handler) {
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

// Pull the account wishlist into the local cache. Call on app start / after
// login for signed-in users. No-op (and harmless) for guests.
export async function syncWishlistFromServer() {
  if (!getAuthUser()) return;
  try {
    const { data } = await fetchWishlist();
    if (Array.isArray(data)) write(fromServer(data));
  } catch {
    /* network failure — keep whatever is cached locally */
  }
}

// On login: push any guest (local-only) items up to the account, then pull the
// merged list back down so both sides agree.
export async function mergeLocalWishlistToServer() {
  if (!getAuthUser()) return;
  const ids = read().map(idOf).filter(isObjectId);
  if (ids.length > 0) {
    await Promise.allSettled(ids.map((id) => addWishlistItem(id)));
  }
  await syncWishlistFromServer();
}

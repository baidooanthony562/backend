import { describe, it, expect, vi, beforeEach } from 'vitest';

// Control auth state per test; mock the backend API.
const { authState } = vi.hoisted(() => ({ authState: { user: null } }));
vi.mock('./auth', () => ({ getAuthUser: () => authState.user }));
vi.mock('./api', () => ({
  fetchWishlist: vi.fn(),
  addWishlistItem: vi.fn(() => Promise.resolve({})),
  removeWishlistItem: vi.fn(() => Promise.resolve({})),
}));

import {
  getWishlist, isInWishlist, addToWishlist, removeFromWishlist,
  syncWishlistFromServer, mergeLocalWishlistToServer,
} from './wishlist';
import { fetchWishlist, addWishlistItem, removeWishlistItem } from './api';

const OID1 = '0123456789abcdef01234567';
const OID2 = '89abcdef0123456789abcdef';

beforeEach(() => {
  localStorage.clear();
  authState.user = null;
  vi.clearAllMocks();
});

describe('wishlist — guest', () => {
  it('adds to the local cache without calling the backend', () => {
    addToWishlist({ _id: OID1, name: 'A' });
    expect(getWishlist()).toHaveLength(1);
    expect(isInWishlist(OID1)).toBe(true);
    expect(addWishlistItem).not.toHaveBeenCalled();
  });

  it('does not store duplicates', () => {
    addToWishlist({ _id: OID1, name: 'A' });
    addToWishlist({ _id: OID1, name: 'A' });
    expect(getWishlist()).toHaveLength(1);
  });

  it('treats a server sync as a no-op when signed out', async () => {
    await syncWishlistFromServer();
    expect(fetchWishlist).not.toHaveBeenCalled();
  });
});

describe('wishlist — signed in', () => {
  beforeEach(() => { authState.user = { _id: 'u1' }; });

  it('mirrors an add to the account', () => {
    addToWishlist({ _id: OID1, name: 'A' });
    expect(addWishlistItem).toHaveBeenCalledWith(OID1);
  });

  it('mirrors a remove to the account', () => {
    addToWishlist({ _id: OID1, name: 'A' });
    removeFromWishlist(OID1);
    expect(removeWishlistItem).toHaveBeenCalledWith(OID1);
    expect(getWishlist()).toHaveLength(0);
  });

  it('syncs the cache from the server, normalizing product shape', async () => {
    fetchWishlist.mockResolvedValue({ data: [{ _id: OID1, name: 'Srv', images: ['img.png'] }] });
    await syncWishlistFromServer();
    const [item] = getWishlist();
    expect(item.id).toBe(OID1);
    expect(item.image).toBe('img.png');
  });

  it('merges guest items up to the account on login, then re-syncs', async () => {
    addToWishlist({ _id: OID1, name: 'A' });
    addToWishlist({ _id: OID2, name: 'B' });
    vi.clearAllMocks();
    fetchWishlist.mockResolvedValue({ data: [{ _id: OID1 }, { _id: OID2 }] });

    await mergeLocalWishlistToServer();

    expect(addWishlistItem).toHaveBeenCalledWith(OID1);
    expect(addWishlistItem).toHaveBeenCalledWith(OID2);
    expect(fetchWishlist).toHaveBeenCalled();
    expect(getWishlist()).toHaveLength(2);
  });
});

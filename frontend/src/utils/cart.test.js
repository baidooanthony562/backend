import { describe, it, expect } from 'vitest';
import { readCart, writeCart, clearCart, getCartCount } from './cart';

describe('cart util', () => {
  it('starts empty', () => {
    expect(readCart()).toEqual([]);
  });

  it('round-trips items through storage', () => {
    writeCart([{ _id: 'a', quantity: 2 }]);
    expect(readCart()).toEqual([{ _id: 'a', quantity: 2 }]);
  });

  it('self-heals a corrupt stored value to an empty cart', () => {
    localStorage.setItem('cart', 'this is not json');
    expect(readCart()).toEqual([]);
  });

  it('ignores a non-array stored value', () => {
    localStorage.setItem('cart', JSON.stringify({ not: 'an array' }));
    expect(readCart()).toEqual([]);
  });

  it('sums quantities for the badge count', () => {
    writeCart([{ _id: 'a', quantity: 2 }, { _id: 'b', quantity: 3 }]);
    expect(getCartCount()).toBe(5);
  });

  it('clears the cart', () => {
    writeCart([{ _id: 'a', quantity: 1 }]);
    clearCart();
    expect(readCart()).toEqual([]);
  });
});

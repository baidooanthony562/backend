import { describe, it, expect } from 'vitest';
import { readCart, writeCart, clearCart, getCartCount, addProductToCart } from './cart';

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

describe('addProductToCart', () => {
  it('adds a new product in the expected cart shape', () => {
    addProductToCart({ _id: 'p1', name: 'Blender', price: 250, images: ['b.png'] }, 2);
    const [item] = readCart();
    expect(item).toMatchObject({ id: 'p1', name: 'Blender', quantity: 2, unitPrice: 250, image: 'b.png' });
  });

  it('bumps quantity when the product is already in the cart', () => {
    addProductToCart({ _id: 'p1', name: 'Blender', price: 250 }, 1);
    addProductToCart({ _id: 'p1', name: 'Blender', price: 250 }, 2);
    const cart = readCart();
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(3);
  });

  it('applies wholesale pricing once the quantity qualifies', () => {
    addProductToCart({ _id: 'p1', name: 'Cups', price: 10, wholesalePrice: 7, wholesaleMinQty: 5 }, 5);
    const [item] = readCart();
    expect(item.isWholesale).toBe(true);
    expect(item.unitPrice).toBe(7);
  });
});

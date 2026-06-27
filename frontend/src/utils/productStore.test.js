import { describe, it, expect } from 'vitest';
import { getProducts, saveProducts, upsertProduct, removeProduct } from './productStore';

describe('productStore', () => {
  it('returns an empty list when nothing is cached (no fake fallback catalogue)', () => {
    // This is a deliberate invariant: showing fabricated sample products to a
    // real shopper let them try to buy items the store does not sell.
    expect(getProducts()).toEqual([]);
  });

  it('saves and reads back a product list', () => {
    saveProducts([{ _id: '1', name: 'A' }]);
    expect(getProducts()).toEqual([{ _id: '1', name: 'A' }]);
  });

  it('upsert updates an existing product in place', () => {
    saveProducts([{ _id: '1', name: 'A', price: 10 }]);
    upsertProduct({ _id: '1', price: 99 });
    const products = getProducts();
    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({ _id: '1', name: 'A', price: 99 });
  });

  it('upsert appends a product that is not yet stored', () => {
    saveProducts([{ _id: '1', name: 'A' }]);
    upsertProduct({ _id: '2', name: 'B' });
    expect(getProducts()).toHaveLength(2);
  });

  it('removes a product by id', () => {
    saveProducts([{ _id: '1', name: 'A' }, { _id: '2', name: 'B' }]);
    removeProduct('1');
    const products = getProducts();
    expect(products).toHaveLength(1);
    expect(products[0]._id).toBe('2');
  });
});

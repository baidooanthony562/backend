import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProductCard from './ProductCard';

function renderCard(product) {
  return render(
    <MemoryRouter>
      <ProductCard product={product} />
    </MemoryRouter>
  );
}

describe('ProductCard', () => {
  it('renders the product name and price', () => {
    renderCard({ _id: '1', name: 'Test Blender', price: 250, stock: 5, reviews: [] });
    expect(screen.getByText('Test Blender')).toBeInTheDocument();
    expect(screen.getByText(/250/)).toBeInTheDocument();
  });

  it('shows no review count when the product has no reviews', () => {
    // Guards the "no fabricated review counts" behaviour: a brand-new product
    // (rating 0, reviews []) must not display a parenthesised count.
    renderCard({ _id: '1', name: 'New Product', price: 100, stock: 5, rating: 0, reviews: [] });
    expect(screen.queryByText(/^\(\d+\)$/)).toBeNull();
  });

  it('shows the real review count when reviews exist', () => {
    renderCard({ _id: '1', name: 'Popular', price: 100, stock: 5, rating: 4, reviews: ['r1', 'r2', 'r3'] });
    expect(screen.getByText('(3)')).toBeInTheDocument();
  });
});

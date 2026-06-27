import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LowStockAlerts from './LowStockAlerts';

describe('LowStockAlerts', () => {
  it('warns when no products are loaded instead of a false all-clear', () => {
    render(<LowStockAlerts products={[]} />);
    expect(screen.getByText(/no products loaded/i)).toBeInTheDocument();
    expect(screen.queryByText(/well stocked/i)).toBeNull();
  });

  it('reports all well stocked when every product is above the threshold', () => {
    render(<LowStockAlerts products={[{ _id: '1', name: 'Plenty', stock: 20 }]} />);
    expect(screen.getByText(/well stocked/i)).toBeInTheDocument();
  });

  it('lists only products at or below the threshold', () => {
    render(<LowStockAlerts products={[
      { _id: '1', name: 'Low One', stock: 3 },
      { _id: '2', name: 'Well Stocked', stock: 50 },
    ]} />);
    expect(screen.getByText('Low One')).toBeInTheDocument();
    expect(screen.getByText('3 left')).toBeInTheDocument();
    expect(screen.queryByText('Well Stocked')).toBeNull();
  });

  it('respects a custom threshold passed from the backend', () => {
    render(<LowStockAlerts products={[{ _id: '1', name: 'Eight Left', stock: 8 }]} threshold={10} />);
    expect(screen.getByText('Eight Left')).toBeInTheDocument();
  });
});

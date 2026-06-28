import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import OrderStatusTracker from './OrderStatusTracker';

describe('OrderStatusTracker', () => {
  it('shows the timeline with the current step highlighted', () => {
    render(<OrderStatusTracker status="Processing" />);
    expect(screen.getByText('Order Status')).toBeInTheDocument();
    expect(screen.getByText('Processing')).toBeInTheDocument();
    expect(screen.getByText('Current status')).toBeInTheDocument();
  });

  it('renders all four steps for a delivered order', () => {
    render(<OrderStatusTracker status="Delivered" />);
    ['Pending', 'Processing', 'Shipped', 'Delivered'].forEach((s) =>
      expect(screen.getByText(s)).toBeInTheDocument()
    );
  });

  it('renders a distinct cancelled state (not the timeline)', () => {
    render(<OrderStatusTracker status="Cancelled" />);
    expect(screen.getByText('Order Cancelled')).toBeInTheDocument();
    expect(screen.queryByText('Order Status')).toBeNull();
  });

  it('renders a refunded state', () => {
    render(<OrderStatusTracker status="Refunded" />);
    expect(screen.getByText('Order Refunded')).toBeInTheDocument();
  });
});

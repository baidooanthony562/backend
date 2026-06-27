import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Mock the router hooks: a fixed reference in the URL and a spyable navigate.
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (orig) => ({
  ...(await orig()),
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams('reference=PSREF-TEST')],
}));

// Mock the API and auth layers so no real network calls happen.
vi.mock('../utils/api', () => ({
  verifyPaystackPayment: vi.fn(),
  createOrder: vi.fn(),
  createGuestOrder: vi.fn(),
}));
vi.mock('../utils/auth', () => ({ getToken: () => '' }));
vi.mock('../utils/cart', () => ({ clearCart: vi.fn() }));

import PaymentVerify from './PaymentVerify';
import { verifyPaystackPayment, createOrder } from '../utils/api';

const PENDING = JSON.stringify({
  orderPayload: { orderItems: [{ product: 'p1', quantity: 1 }], totalPrice: 100 },
  isGuest: false,
});

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

describe('PaymentVerify', () => {
  it('creates the order and clears pending data on success', async () => {
    sessionStorage.setItem('paystackPending', PENDING);
    verifyPaystackPayment.mockResolvedValue({});
    createOrder.mockResolvedValue({ data: { _id: 'order123' } });

    render(<PaymentVerify />);

    await waitFor(() => expect(screen.getByText(/payment successful/i)).toBeInTheDocument());
    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ paystackReference: 'PSREF-TEST' }),
      ''
    );
    // The pending payload is consumed only after the order is created.
    expect(sessionStorage.getItem('paystackPending')).toBeNull();
  });

  it('keeps the payload and offers a retry when order creation fails after payment', async () => {
    sessionStorage.setItem('paystackPending', PENDING);
    verifyPaystackPayment.mockResolvedValue({});
    createOrder.mockRejectedValue({ response: { data: { message: 'Out of stock' } } });

    render(<PaymentVerify />);

    await waitFor(() => expect(screen.getByText(/retry creating my order/i)).toBeInTheDocument());
    // Crucially, the order details are NOT discarded — the customer can retry.
    expect(sessionStorage.getItem('paystackPending')).toBe(PENDING);
    // The reference is surfaced so support can reconcile a paid-but-no-order case.
    expect(screen.getByText(/PSREF-TEST/)).toBeInTheDocument();
  });

  it('treats an already-used reference as an order that already exists', async () => {
    sessionStorage.setItem('paystackPending', PENDING);
    verifyPaystackPayment.mockResolvedValue({});
    createOrder.mockRejectedValue({ response: { data: { message: 'This payment has already been used for an order.' } } });

    render(<PaymentVerify />);

    await waitFor(() => expect(screen.getByText(/already created/i)).toBeInTheDocument());
    // No retry button here — there's nothing to retry, the order exists.
    expect(screen.queryByText(/retry creating my order/i)).toBeNull();
    expect(sessionStorage.getItem('paystackPending')).toBeNull();
  });

  it('tells the customer to contact support with the reference when details are missing', async () => {
    // No paystackPending set — simulates a tab restore / lost session.
    render(<PaymentVerify />);

    await waitFor(() => expect(screen.getByText(/couldn't find your order details/i)).toBeInTheDocument());
    expect(screen.getByText(/PSREF-TEST/)).toBeInTheDocument();
  });
});

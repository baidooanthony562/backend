import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Mock the router hooks: a fixed reference in the URL and a spyable navigate.
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (orig) => ({
  ...(await orig()),
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams('reference=PSREF-TEST')],
}));

// Mock the API and auth/cart layers so no real network calls happen.
vi.mock('../utils/api', () => ({
  finalizePaystackOrder: vi.fn(),
  verifyPaystackPayment: vi.fn(),
  createOrder: vi.fn(),
  createGuestOrder: vi.fn(),
}));
vi.mock('../utils/auth', () => ({ getToken: () => '' }));
vi.mock('../utils/cart', () => ({ clearCart: vi.fn() }));

import PaymentVerify from './PaymentVerify';
import { finalizePaystackOrder, verifyPaystackPayment, createOrder } from '../utils/api';

const PENDING = JSON.stringify({
  orderPayload: { orderItems: [{ product: 'p1', quantity: 1 }], totalPrice: 100 },
  isGuest: false,
});

const notFound = { response: { status: 404, data: { message: 'No pending order found.' } } };

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

describe('PaymentVerify', () => {
  it('finalizes the order on the server and redirects on success', async () => {
    finalizePaystackOrder.mockResolvedValue({ data: { _id: 'order123' } });

    render(<PaymentVerify />);

    await waitFor(() => expect(screen.getByText(/payment successful/i)).toBeInTheDocument());
    expect(finalizePaystackOrder).toHaveBeenCalledWith('PSREF-TEST');
  });

  it('keeps the payload and offers a retry when finalize fails after payment', async () => {
    sessionStorage.setItem('paystackPending', PENDING);
    finalizePaystackOrder.mockRejectedValue({ response: { status: 400, data: { message: 'Out of stock' } } });

    render(<PaymentVerify />);

    await waitFor(() => expect(screen.getByText(/retry creating my order/i)).toBeInTheDocument());
    // The order details are NOT discarded — the customer can retry.
    expect(sessionStorage.getItem('paystackPending')).toBe(PENDING);
    // The reference is surfaced so support can reconcile a paid-but-no-order case.
    expect(screen.getByText(/PSREF-TEST/)).toBeInTheDocument();
  });

  it('falls back to client-side creation when the server has no saved intent', async () => {
    sessionStorage.setItem('paystackPending', PENDING);
    finalizePaystackOrder.mockRejectedValue(notFound);
    verifyPaystackPayment.mockResolvedValue({});
    createOrder.mockResolvedValue({ data: { _id: 'order999' } });

    render(<PaymentVerify />);

    await waitFor(() => expect(screen.getByText(/payment successful/i)).toBeInTheDocument());
    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ paystackReference: 'PSREF-TEST' }),
      ''
    );
  });

  it('treats an already-used reference in the fallback as an existing order', async () => {
    sessionStorage.setItem('paystackPending', PENDING);
    finalizePaystackOrder.mockRejectedValue(notFound);
    verifyPaystackPayment.mockResolvedValue({});
    createOrder.mockRejectedValue({ response: { data: { message: 'This payment has already been used for an order.' } } });

    render(<PaymentVerify />);

    await waitFor(() => expect(screen.getByText(/already created/i)).toBeInTheDocument());
    expect(screen.queryByText(/retry creating my order/i)).toBeNull();
    expect(sessionStorage.getItem('paystackPending')).toBeNull();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('react-router-dom', async (orig) => ({
  ...(await orig()),
  useNavigate: () => vi.fn(),
}));

vi.mock('../utils/api', () => ({
  createOrder: vi.fn(),
  createGuestOrder: vi.fn(),
  validatePromo: vi.fn(),
  initiateMoMoPayment: vi.fn(),
  checkMoMoStatus: vi.fn(),
  initializePaystackPayment: vi.fn(),
}));

const { authState } = vi.hoisted(() => ({ authState: { signedIn: false } }));
vi.mock('../utils/auth', () => ({
  getAuthUser: () => (authState.signedIn ? { email: 'u@test.com', name: 'U' } : null),
  getToken: () => '',
  isAuthenticated: () => authState.signedIn,
}));

import { MemoryRouter } from 'react-router-dom';
import Cart from './Cart';
import { writeCart } from '../utils/cart';
import { validatePromo } from '../utils/api';

const ITEM = { _id: '0123456789abcdef01234567', name: 'Widget', price: 100, quantity: 1, image: '' };

function renderCart() {
  return render(<MemoryRouter><Cart /></MemoryRouter>);
}

beforeEach(() => {
  localStorage.clear();
  authState.signedIn = false;
  vi.clearAllMocks();
});

describe('Cart checkout validation', () => {
  it('blocks checkout with an empty cart', () => {
    renderCart();
    fireEvent.click(screen.getByText(/pay securely with paystack/i));
    expect(screen.getByText(/add at least one item/i)).toBeInTheDocument();
  });

  it('requires a shipping address before checkout', () => {
    writeCart([ITEM]);
    renderCart();
    fireEvent.click(screen.getByText(/pay securely with paystack/i));
    expect(screen.getByText(/fill in your shipping address/i)).toBeInTheDocument();
  });

  it('requires guest name/email once shipping is filled', () => {
    writeCart([ITEM]);
    renderCart();
    fireEvent.change(screen.getByPlaceholderText(/street address/i), { target: { value: '1 Test St' } });
    fireEvent.change(screen.getByPlaceholderText(/^city$/i), { target: { value: 'Kumasi' } });
    fireEvent.change(screen.getByPlaceholderText(/phone number/i), { target: { value: '0240000000' } });
    fireEvent.click(screen.getByText(/pay securely with paystack/i));
    expect(screen.getByText(/please enter your name/i)).toBeInTheDocument();
  });

  it('applies a valid promo code to the summary', async () => {
    writeCart([ITEM]);
    validatePromo.mockResolvedValue({ data: { code: 'SAVE10', discountAmount: 10, totalAfterDiscount: 90 } });
    renderCart();
    fireEvent.change(screen.getByPlaceholderText(/enter code/i), { target: { value: 'SAVE10' } });
    fireEvent.click(screen.getByText('Apply'));
    await waitFor(() => expect(screen.getByText(/you save ₵10\.00/i)).toBeInTheDocument());
  });
});

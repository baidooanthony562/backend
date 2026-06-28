import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Logo from './Logo';

describe('Logo', () => {
  it('renders an accessible monogram', () => {
    render(<Logo />);
    const img = screen.getByRole('img', { name: /cindy nat/i });
    expect(img.tagName.toLowerCase()).toBe('svg');
    expect(img).toHaveTextContent('CN');
  });

  it('applies the requested size', () => {
    render(<Logo size={56} />);
    const img = screen.getByRole('img', { name: /cindy nat/i });
    expect(img).toHaveAttribute('width', '56');
    expect(img).toHaveAttribute('height', '56');
  });
});

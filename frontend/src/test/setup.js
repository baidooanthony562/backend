// Adds jest-dom matchers (toBeInTheDocument, etc.) and resets persisted state
// between tests so localStorage-backed utils don't leak across cases.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

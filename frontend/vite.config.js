import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Generate .map files alongside the JS — uploaded to Sentry by the
    // `upload-sourcemaps` script after each production build.
    sourcemap: true,
  },
  server: {
    port: 3000,
  },
  test: {
    // Component tests need a DOM; the util tests rely on localStorage/window.
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    // Don't pull Tailwind/PostCSS through the test transform — irrelevant here.
    css: false,
  },
});

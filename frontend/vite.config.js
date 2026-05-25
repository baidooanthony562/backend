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
});

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import * as Sentry from '@sentry/react';
import App from './App';
import './index.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

// Initialise Sentry only when a DSN is configured — safe no-op locally.
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0,
  });
}

// Load Google Analytics 4 in production. Prefers the VITE_GA_MEASUREMENT_ID
// env var so the value can be swapped per environment without a redeploy,
// but falls back to the hardcoded ID below so we are not blocked when the
// env var is missing or fails to reach the Vercel build. GA4's "Enhanced
// Measurement" auto-tracks SPA route changes, so we don't fire page_view
// manually on every navigation.
const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID
  || (import.meta.env.PROD ? 'G-QPQKVEKQ7Z' : '');
if (GA_ID) {
  const script = document.createElement('script');
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  script.async = true;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', GA_ID);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
);

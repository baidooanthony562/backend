// Consent-gated Google Analytics. GA4 sets third-party analytics cookies, so
// (per the privacy policy and GDPR/UK-GDPR for diaspora visitors) it must not
// load until the visitor accepts. The login session cookie is essential and is
// unaffected by this choice.

const CONSENT_KEY = 'cindyCookieConsent'; // 'accepted' | 'declined' | null

const GA_ID =
  import.meta.env.VITE_GA_MEASUREMENT_ID ||
  (import.meta.env.PROD ? 'G-QPQKVEKQ7Z' : '');

export function getConsent() {
  try { return localStorage.getItem(CONSENT_KEY); } catch { return null; }
}

export function setConsent(value) {
  try { localStorage.setItem(CONSENT_KEY, value); } catch { /* storage blocked */ }
}

let loaded = false;
export function loadGA() {
  if (loaded || !GA_ID) return;
  loaded = true;
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

// Called on boot: only start analytics if the visitor previously accepted.
export function initAnalytics() {
  if (getConsent() === 'accepted') loadGA();
}

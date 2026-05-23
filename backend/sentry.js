// Sentry must initialise before any other modules are required so its
// auto-instrumentation can hook into Express, Mongoose, fetch, etc. at
// load time. server.js requires this file before anything else.
//
// When SENTRY_DSN is unset the init is skipped and Sentry becomes a
// silent no-op, so this is safe in development.
require('dotenv').config();
const Sentry = require('@sentry/node');

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
  });
  console.log('[Sentry] Initialised');
}

module.exports = Sentry;

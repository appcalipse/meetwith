// This file configures the initialization of Sentry on the browser.
// The config you add here will be used whenever a page is visited.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_ENV,
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 0,
  silent: process.env.NEXT_PUBLIC_ENV === 'production', // Suppresses all logs
  enabled:
    process.env.NEXT_PUBLIC_ENV === 'development' ||
    process.env.NEXT_PUBLIC_ENV === 'production',
  // ...
  // Note: if you want to override the automatic release value, do not set a
  // `release` value here - use the environment variable `SENTRY_RELEASE`, so
  // that it will also get attached to your source maps
})

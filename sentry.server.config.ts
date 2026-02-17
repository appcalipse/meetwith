// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NEXT_PUBLIC_ENV === 'production',

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Keep trace sampling low to avoid adding SSR latency.
  // 100% tracing wraps every request in performance instrumentation.
  tracesSampleRate: 0.1,
})

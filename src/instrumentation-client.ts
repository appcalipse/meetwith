// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

const isEnabled = process.env.NEXT_PUBLIC_ENV === 'production'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_ENV,
  enabled: isEnabled,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Replay intentionally excluded — adds ~70-100KB to client bundle,
  // installs DOM MutationObserver that records every DOM change.
  // This alone can add 200-400ms to TBT.
  integrations: [],

  // Keep low. 100% tracing creates a performance trace for every
  // client-side navigation, adding network + CPU overhead.
  tracesSampleRate: 0.1,
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart

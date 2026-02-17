import posthog, { CapturedNetworkRequest } from 'posthog-js'

import { isProduction } from './constants'

let analyticsInitialized = false

const initAnalytics = async () => {
  if (analyticsInitialized) return
  // Defer PostHog initialization to after page interactive
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    ;(
      window as Window & { requestIdleCallback: (cb: () => void) => void }
    ).requestIdleCallback(() => {
      doInit()
    })
  } else {
    // Fallback: defer to next macrotask
    setTimeout(doInit, 0)
  }
}

const doInit = () => {
  if (analyticsInitialized) return
  analyticsInitialized = true
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: '/ingest',
    capture_exceptions: true,
    debug: false,
    defaults: '2025-05-24',
    autocapture: isProduction,
    session_recording: {
      maskCapturedNetworkRequestFn: (request: CapturedNetworkRequest) => {
        request.responseBody = request.responseBody?.replace(
          /"signature":\s*"[^"]*"/g,
          '"signature": "redacted-signature"'
        )
        return request
      },
      recordBody: true,
    },
    ui_host: 'https://eu.posthog.com',
  })
}

const logEvent = (eventName: string, properties?: object) => {
  isProduction && posthog.capture(eventName, properties)
}

const pageView = (path: string) => {
  isProduction && posthog.capture('Page viewed', { path })
}

export { initAnalytics, logEvent, pageView }

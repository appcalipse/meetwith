import posthog, { CapturedNetworkRequest } from 'posthog-js'

import { isProduction } from './constants'

const initAnalytics = async () => {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: '/ingest',
    capture_exceptions: true,
    debug: false,
    defaults: '2025-05-24',
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

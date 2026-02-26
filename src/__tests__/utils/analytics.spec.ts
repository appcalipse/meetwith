import type posthogType from 'posthog-js'

type InitAnalytics = (shouldInitialize: boolean) => Promise<void>
type LogEvent = (eventName: string, properties?: object) => void
type PageView = (path: string) => void

let posthog: typeof posthogType
let initAnalytics: InitAnalytics
let logEvent: LogEvent
let pageView: PageView

const loadAnalytics = () => {
  posthog = require('posthog-js')
  ;({ initAnalytics, logEvent, pageView } = require('@/utils/analytics'))
}

jest.mock('posthog-js', () => ({
  init: jest.fn(),
  capture: jest.fn(),
}))

jest.mock('@/utils/constants', () => ({
  isProduction: true,
}))

describe('analytics', () => {
  const originalEnv = process.env
  let originalRequestIdleCallback: any

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_POSTHOG_KEY: 'test-posthog-key',
    }

    // Mock requestIdleCallback directly on the existing window object
    // instead of replacing global.window (which breaks in jsdom)
    originalRequestIdleCallback = (window as any).requestIdleCallback
    ;(window as any).requestIdleCallback = (cb: () => void) => cb()

    jest.resetModules()
    // Re-register the constants mock after resetModules to prevent
    // jest.doMock leakage from the "should respect isProduction flag" test
    jest.doMock('@/utils/constants', () => ({
      isProduction: true,
    }))
    loadAnalytics()
    jest.clearAllMocks()
  })

  afterEach(() => {
    process.env = originalEnv
    if (originalRequestIdleCallback === undefined) {
      delete (window as any).requestIdleCallback
    } else {
      ;(window as any).requestIdleCallback = originalRequestIdleCallback
    }
  })

  describe('initAnalytics', () => {
    it('should initialize posthog with correct config', async () => {
      await initAnalytics(false)

      expect(posthog.init).toHaveBeenCalledWith(
        'test-posthog-key',
        expect.objectContaining({
          api_host: '/ingest',
          capture_exceptions: true,
          debug: false,
          defaults: '2025-05-24',
          autocapture: true,
          ui_host: 'https://eu.posthog.com',
        })
      )
    })

    it('should configure session recording', async () => {
      await initAnalytics(false)

      const callArgs = (posthog.init as jest.Mock).mock.calls[0][1]
      expect(callArgs.session_recording).toBeDefined()
      expect(callArgs.session_recording.recordBody).toBe(true)
      expect(
        callArgs.session_recording.maskCapturedNetworkRequestFn
      ).toBeDefined()
    })

    it('should mask signatures in network requests', async () => {
      await initAnalytics(false)

      const callArgs = (posthog.init as jest.Mock).mock.calls[0][1]
      const maskFn = callArgs.session_recording.maskCapturedNetworkRequestFn

      const mockRequest = {
        responseBody: JSON.stringify({
          signature: 'secret-signature-123',
          data: 'some-data',
        }),
      }

      const maskedRequest = maskFn(mockRequest)

      expect(maskedRequest.responseBody).toContain('redacted-signature')
      expect(maskedRequest.responseBody).not.toContain('secret-signature-123')
    })

    it('should handle multiple signatures in response', async () => {
      await initAnalytics(false)

      const callArgs = (posthog.init as jest.Mock).mock.calls[0][1]
      const maskFn = callArgs.session_recording.maskCapturedNetworkRequestFn

      const mockRequest = {
        responseBody: JSON.stringify({
          signature: 'sig1',
          nested: {
            signature: 'sig2',
          },
        }),
      }

      const maskedRequest = maskFn(mockRequest)

      expect(maskedRequest.responseBody).toContain('redacted-signature')
      expect(maskedRequest.responseBody).not.toContain('sig1')
      expect(maskedRequest.responseBody).not.toContain('sig2')
    })

    it('should handle null response body', async () => {
      await initAnalytics(false)

      const callArgs = (posthog.init as jest.Mock).mock.calls[0][1]
      const maskFn = callArgs.session_recording.maskCapturedNetworkRequestFn

      const mockRequest = {
        responseBody: null,
      }

      const maskedRequest = maskFn(mockRequest)

      expect(maskedRequest.responseBody).toBeUndefined()
    })

    it('should handle undefined response body', async () => {
      await initAnalytics(false)

      const callArgs = (posthog.init as jest.Mock).mock.calls[0][1]
      const maskFn = callArgs.session_recording.maskCapturedNetworkRequestFn

      const mockRequest = {
        responseBody: undefined,
      }

      const maskedRequest = maskFn(mockRequest)

      expect(maskedRequest.responseBody).toBeUndefined()
    })

    it('should preserve response body without signatures', async () => {
      await initAnalytics(false)

      const callArgs = (posthog.init as jest.Mock).mock.calls[0][1]
      const maskFn = callArgs.session_recording.maskCapturedNetworkRequestFn

      const mockRequest = {
        responseBody: JSON.stringify({
          data: 'some-data',
          value: 123,
        }),
      }

      const maskedRequest = maskFn(mockRequest)

      expect(maskedRequest.responseBody).toContain('some-data')
      expect(maskedRequest.responseBody).toContain('123')
    })
  })

  describe('logEvent', () => {
    it('should capture event in production', () => {
      logEvent('test_event')

      expect(posthog.capture).toHaveBeenCalledWith('test_event', undefined)
    })

    it('should capture event with properties', () => {
      const properties = {
        userId: '123',
        action: 'click',
      }

      logEvent('button_clicked', properties)

      expect(posthog.capture).toHaveBeenCalledWith('button_clicked', properties)
    })

    it('should capture event with complex properties', () => {
      const properties = {
        user: {
          id: '123',
          name: 'Test User',
        },
        metadata: {
          timestamp: Date.now(),
          source: 'web',
        },
      }

      logEvent('complex_event', properties)

      expect(posthog.capture).toHaveBeenCalledWith('complex_event', properties)
    })

    it('should capture event with empty properties', () => {
      logEvent('empty_props_event', {})

      expect(posthog.capture).toHaveBeenCalledWith('empty_props_event', {})
    })

    it('should handle event with special characters', () => {
      logEvent('event-with-special_chars.123')

      expect(posthog.capture).toHaveBeenCalledWith(
        'event-with-special_chars.123',
        undefined
      )
    })
  })

  describe('pageView', () => {
    it('should capture page view in production', () => {
      pageView('/dashboard')

      expect(posthog.capture).toHaveBeenCalledWith('Page viewed', {
        path: '/dashboard',
      })
    })

    it('should capture page view with query params', () => {
      pageView('/dashboard?tab=analytics')

      expect(posthog.capture).toHaveBeenCalledWith('Page viewed', {
        path: '/dashboard?tab=analytics',
      })
    })

    it('should capture page view for root path', () => {
      pageView('/')

      expect(posthog.capture).toHaveBeenCalledWith('Page viewed', {
        path: '/',
      })
    })

    it('should capture page view for nested paths', () => {
      pageView('/dashboard/settings/profile')

      expect(posthog.capture).toHaveBeenCalledWith('Page viewed', {
        path: '/dashboard/settings/profile',
      })
    })

    it('should handle empty path', () => {
      pageView('')

      expect(posthog.capture).toHaveBeenCalledWith('Page viewed', {
        path: '',
      })
    })

    it('should handle path with hash', () => {
      pageView('/page#section')

      expect(posthog.capture).toHaveBeenCalledWith('Page viewed', {
        path: '/page#section',
      })
    })
  })

  describe('production vs development', () => {
    it('should respect isProduction flag', () => {
      jest.resetModules()
      jest.doMock('@/utils/constants', () => ({
        isProduction: false,
      }))

      loadAnalytics()
      logEvent('test_event')

      // In development, events should not be captured
      expect(posthog.capture).not.toHaveBeenCalled()
    })

    it('should capture events in production', () => {
      logEvent('production_event')

      expect(posthog.capture).toHaveBeenCalledWith(
        'production_event',
        undefined
      )
    })
  })

  describe('initialization edge cases', () => {
    it('should handle missing PostHog key', async () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = undefined
      // Need to reload the module so it picks up the undefined key
      jest.resetModules()
      jest.doMock('@/utils/constants', () => ({
        isProduction: true,
      }))
      loadAnalytics()
      jest.clearAllMocks()

      await initAnalytics(false)

      expect(posthog.init).toHaveBeenCalledWith(undefined, expect.any(Object))
    })

    it('should initialize with default configurations', async () => {
      await initAnalytics(false)

      const config = (posthog.init as jest.Mock).mock.calls[0][1]

      expect(config.capture_exceptions).toBe(true)
      expect(config.debug).toBe(false)
      expect(config.defaults).toBe('2025-05-24')
    })
  })

  describe('event tracking patterns', () => {
    it('should track user signup event', () => {
      logEvent('user_signup', {
        method: 'wallet',
        timestamp: Date.now(),
      })

      expect(posthog.capture).toHaveBeenCalled()
    })

    it('should track meeting creation event', () => {
      logEvent('meeting_created', {
        duration: 30,
        participants: 2,
      })

      expect(posthog.capture).toHaveBeenCalled()
    })

    it('should track calendar sync event', () => {
      logEvent('calendar_synced', {
        provider: 'google',
        calendarCount: 3,
      })

      expect(posthog.capture).toHaveBeenCalled()
    })

    it('should track error events', () => {
      logEvent('error_occurred', {
        errorType: 'NetworkError',
        message: 'Failed to fetch',
      })

      expect(posthog.capture).toHaveBeenCalled()
    })

    it('should track feature usage', () => {
      logEvent('feature_used', {
        feature: 'quick_poll',
        action: 'create',
      })

      expect(posthog.capture).toHaveBeenCalled()
    })
  })

  describe('session recording masking', () => {
    it('should mask signature with spaces in JSON', async () => {
      await initAnalytics(false)

      const callArgs = (posthog.init as jest.Mock).mock.calls[0][1]
      const maskFn = callArgs.session_recording.maskCapturedNetworkRequestFn

      const mockRequest = {
        responseBody: '{"signature": "secret123"}',
      }

      const result = maskFn(mockRequest)

      expect(result.responseBody).toContain('redacted-signature')
      expect(result.responseBody).not.toContain('secret123')
    })

    it('should mask signature without spaces in JSON', async () => {
      await initAnalytics(false)

      const callArgs = (posthog.init as jest.Mock).mock.calls[0][1]
      const maskFn = callArgs.session_recording.maskCapturedNetworkRequestFn

      const mockRequest = {
        responseBody: '{"signature":"secret123"}',
      }

      const result = maskFn(mockRequest)

      expect(result.responseBody).toContain('redacted-signature')
      expect(result.responseBody).not.toContain('secret123')
    })

    it('should handle response body with escaped quotes', async () => {
      await initAnalytics(false)

      const callArgs = (posthog.init as jest.Mock).mock.calls[0][1]
      const maskFn = callArgs.session_recording.maskCapturedNetworkRequestFn

      const mockRequest = {
        responseBody: '{\\"signature\\":\\"secret123\\"}',
      }

      const result = maskFn(mockRequest)

      expect(result.responseBody).toBeDefined()
    })
  })

  describe('multiple event calls', () => {
    it('should handle multiple logEvent calls', () => {
      logEvent('event1')
      logEvent('event2')
      logEvent('event3')

      expect(posthog.capture).toHaveBeenCalledTimes(3)
    })

    it('should handle multiple pageView calls', () => {
      pageView('/page1')
      pageView('/page2')
      pageView('/page3')

      expect(posthog.capture).toHaveBeenCalledTimes(3)
    })

    it('should handle mixed event and pageView calls', () => {
      logEvent('event1')
      pageView('/page1')
      logEvent('event2')
      pageView('/page2')

      expect(posthog.capture).toHaveBeenCalledTimes(4)
    })
  })
})

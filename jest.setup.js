import '@testing-library/jest-dom/extend-expect'
import 'isomorphic-fetch'

import { Crypto } from '@peculiar/webcrypto'
import { ReadableStream } from 'stream/web'
import { TextDecoder, TextEncoder } from 'util'

// Set required environment variables for tests
process.env.NEXT_PUBLIC_THIRDWEB_ID = 'test-thirdweb-id'
process.env.FROM_MAIL = 'noreply@meetwith.com'
process.env.RESEND_API_KEY = 'test-resend-key'
process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-posthog-key'
process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

global.TextDecoder = TextDecoder
global.TextEncoder = TextEncoder
global.ReadableStream = ReadableStream
global.fetch = jest.fn().mockImplementation(path => {
  return Promise.resolve({
    status: 200,
    json: () =>
      Promise.resolve([
        typeof POAP_MWW !== 'undefined' && path.indexOf(POAP_MWW.itemId) === -1
          ? null
          : {
              event: {},
              tokenId: 'string',
              chain:
                typeof POAP_MWW !== 'undefined'
                  ? SupportedChain.POLYGON_MATIC
                  : '',
              created: 'YYYY-MM-DD HH:mm:ss',
            },
      ]),
  })
})

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})
Object.defineProperty(globalThis, 'crypto', {
  value: new Crypto(),
})

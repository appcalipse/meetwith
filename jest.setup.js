import '@testing-library/jest-dom/extend-expect'
import 'isomorphic-fetch'

import { loadEnvConfig } from '@next/env'
import { Crypto } from '@peculiar/webcrypto'
import { TextDecoder, TextEncoder } from 'util'
global.TextDecoder = TextDecoder
global.TextEncoder = TextEncoder
global.fetch = jest.fn().mockImplementation(path => {
  return Promise.resolve({
    status: 200,
    json: () =>
      Promise.resolve([
        path.indexOf(POAP_MWW.itemId) === -1
          ? null
          : {
              event: {},
              tokenId: 'string',
              chain: SupportedChain.POLYGON_MATIC,
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

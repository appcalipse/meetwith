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

// Mock Supabase client globally
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      contains: jest.fn().mockReturnThis(),
      containedBy: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      match: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      filter: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      then: jest.fn((resolve) => resolve({ data: [], error: null })),
    })),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signIn: jest.fn().mockResolvedValue({ data: null, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ data: null, error: null }),
        download: jest.fn().mockResolvedValue({ data: null, error: null }),
        remove: jest.fn().mockResolvedValue({ data: null, error: null }),
      })),
    },
  })),
}))

// Mock sharp for image processing
jest.mock('sharp', () => {
  const mockSharp = jest.fn(() => ({
    resize: jest.fn().mockReturnThis(),
    toFormat: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('test')),
    rotate: jest.fn().mockReturnThis(),
    extract: jest.fn().mockReturnThis(),
    metadata: jest.fn().mockResolvedValue({ width: 100, height: 100 }),
    lanczos3: jest.fn().mockReturnThis(),
  }))
  
  // Add static properties
  mockSharp.fit = {
    inside: 'inside',
    cover: 'cover',
    contain: 'contain',
    fill: 'fill',
    outside: 'outside',
  }
  
  mockSharp.kernel = {
    lanczos3: 'lanczos3',
    lanczos2: 'lanczos2',
    cubic: 'cubic',
    mitchell: 'mitchell',
  }
  
  return mockSharp
})

// Mock email templates
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ id: 'test-email-id' }),
    },
  })),
}))

// Mock Sentry
jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  init: jest.fn(),
}))

// Mock PostHog
jest.mock('posthog-js', () => ({
  init: jest.fn(),
  capture: jest.fn(),
  identify: jest.fn(),
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
  }),
}))

// Mock @tanstack/react-query
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(() => ({ 
    data: null, 
    isLoading: false, 
    error: null,
    reset: jest.fn(),
    refetch: jest.fn(),
    isRefetching: false,
  })),
  useInfiniteQuery: jest.fn(() => ({ 
    data: null, 
    isLoading: false, 
    error: null,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  })),
  useMutation: jest.fn(() => ({ mutate: jest.fn(), isLoading: false })),
  useQueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
    getQueryData: jest.fn(),
  })),
  QueryClient: jest.fn().mockImplementation(() => ({
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
    getQueryData: jest.fn(),
  })),
  QueryClientProvider: ({ children }) => children,
}))

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => '00000000-0000-0000-0000-000000000000'),
  validate: jest.fn(() => true),
}))

// Mock WalletConnect (optional modules)
jest.mock(
  '@walletconnect/web3-provider',
  () => ({
    default: jest.fn(),
  }),
  { virtual: true }
)

jest.mock(
  '@walletconnect/sign-client',
  () => ({
    default: jest.fn(),
  }),
  { virtual: true }
)

// Mock viem
jest.mock('viem', () => ({
  createPublicClient: jest.fn(),
  createWalletClient: jest.fn(),
  http: jest.fn(),
  parseEther: jest.fn(),
  formatEther: jest.fn(),
  encodeFunctionData: jest.fn(),
  decodeFunctionData: jest.fn(),
}))

// Mock @chakra-ui/react useColorMode
jest.mock('@chakra-ui/react', () => {
  const React = require('react')
  return {
    ChakraProvider: ({ children }) => children,
    useColorMode: jest.fn(() => ({
      colorMode: 'dark',
      setColorMode: jest.fn(),
      toggleColorMode: jest.fn(),
    })),
    useToast: jest.fn(() => jest.fn()),
    Box: jest.fn(({ children }) => React.createElement('div', null, children)),
    Flex: jest.fn(({ children }) => React.createElement('div', null, children)),
    Input: jest.fn(({ children }) => React.createElement('input', null, children)),
    Button: jest.fn(({ children }) => React.createElement('button', null, children)),
    Text: jest.fn(({ children }) => React.createElement('span', null, children)),
    Heading: jest.fn(({ children }) => React.createElement('h1', null, children)),
    Stack: jest.fn(({ children }) => React.createElement('div', null, children)),
    HStack: jest.fn(({ children }) => React.createElement('div', null, children)),
    VStack: jest.fn(({ children }) => React.createElement('div', null, children)),
  }
})

// Add navigator.clipboard mock
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
    readText: jest.fn().mockResolvedValue(''),
  },
})

// Set environment to localhost for constants
process.env.NEXT_PUBLIC_VERCEL_URL = 'localhost'
process.env.VERCEL_URL = 'localhost'

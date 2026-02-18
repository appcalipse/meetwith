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

// Mock @chakra-ui/react with comprehensive Proxy-based approach
jest.mock('@chakra-ui/react', () => {
  const React = require('react')
  
  // Create a generic React component that accepts any props and renders children
  const createMockComponent = (displayName) => {
    const Component = ({ children, ...props }) => React.createElement('div', props, children)
    Component.displayName = displayName
    return Component
  }

  // Explicit mocks for commonly used components and hooks
  const explicitMocks = {
    // Provider
    ChakraProvider: ({ children }) => children,
    
    // Hooks
    useColorMode: jest.fn(() => ({
      colorMode: 'dark',
      setColorMode: jest.fn(),
      toggleColorMode: jest.fn(),
    })),
    useColorModeValue: jest.fn((light, dark) => light),
    useDisclosure: jest.fn(() => ({
      isOpen: false,
      onOpen: jest.fn(),
      onClose: jest.fn(),
      onToggle: jest.fn(),
    })),
    useBreakpointValue: jest.fn((values) => {
      if (typeof values === 'object') {
        return values.base || values.md || values.lg || Object.values(values)[0]
      }
      return values
    }),
    useMediaQuery: jest.fn(() => [false, false]),
    useToast: jest.fn(() => jest.fn()),
    useTheme: jest.fn(() => ({})),
    useStyles: jest.fn(() => ({})),
    useMultiStyleConfig: jest.fn(() => ({})),
    useStyleConfig: jest.fn(() => ({})),
    useToken: jest.fn((...args) => args),
    useClipboard: jest.fn(() => ({ onCopy: jest.fn(), hasCopied: false, value: '' })),
    
    // Special functions
    forwardRef: React.forwardRef,
    createStandaloneToast: jest.fn(() => ({
      toast: jest.fn(),
      ToastContainer: createMockComponent('ToastContainer'),
    })),
    
    // Layout Components
    Box: createMockComponent('Box'),
    Flex: createMockComponent('Flex'),
    Grid: createMockComponent('Grid'),
    GridItem: createMockComponent('GridItem'),
    SimpleGrid: createMockComponent('SimpleGrid'),
    Stack: createMockComponent('Stack'),
    HStack: createMockComponent('HStack'),
    VStack: createMockComponent('VStack'),
    Wrap: createMockComponent('Wrap'),
    WrapItem: createMockComponent('WrapItem'),
    Center: createMockComponent('Center'),
    Container: createMockComponent('Container'),
    Spacer: createMockComponent('Spacer'),
    
    // Typography
    Text: createMockComponent('Text'),
    Heading: createMockComponent('Heading'),
    
    // Form Components
    Input: createMockComponent('Input'),
    Button: createMockComponent('Button'),
    IconButton: createMockComponent('IconButton'),
    Checkbox: createMockComponent('Checkbox'),
    Radio: createMockComponent('Radio'),
    RadioGroup: createMockComponent('RadioGroup'),
    Switch: createMockComponent('Switch'),
    Select: createMockComponent('Select'),
    Textarea: createMockComponent('Textarea'),
    FormControl: createMockComponent('FormControl'),
    FormLabel: createMockComponent('FormLabel'),
    FormErrorMessage: createMockComponent('FormErrorMessage'),
    FormHelperText: createMockComponent('FormHelperText'),
    NumberInput: createMockComponent('NumberInput'),
    NumberInputField: createMockComponent('NumberInputField'),
    NumberInputStepper: createMockComponent('NumberInputStepper'),
    NumberIncrementStepper: createMockComponent('NumberIncrementStepper'),
    NumberDecrementStepper: createMockComponent('NumberDecrementStepper'),
    PinInput: createMockComponent('PinInput'),
    PinInputField: createMockComponent('PinInputField'),
    Slider: createMockComponent('Slider'),
    SliderTrack: createMockComponent('SliderTrack'),
    SliderFilledTrack: createMockComponent('SliderFilledTrack'),
    SliderThumb: createMockComponent('SliderThumb'),
    Editable: createMockComponent('Editable'),
    EditableInput: createMockComponent('EditableInput'),
    EditablePreview: createMockComponent('EditablePreview'),
    
    // Overlay Components
    Modal: createMockComponent('Modal'),
    ModalOverlay: createMockComponent('ModalOverlay'),
    ModalContent: createMockComponent('ModalContent'),
    ModalHeader: createMockComponent('ModalHeader'),
    ModalBody: createMockComponent('ModalBody'),
    ModalFooter: createMockComponent('ModalFooter'),
    ModalCloseButton: createMockComponent('ModalCloseButton'),
    Drawer: createMockComponent('Drawer'),
    DrawerOverlay: createMockComponent('DrawerOverlay'),
    DrawerContent: createMockComponent('DrawerContent'),
    DrawerHeader: createMockComponent('DrawerHeader'),
    DrawerBody: createMockComponent('DrawerBody'),
    DrawerFooter: createMockComponent('DrawerFooter'),
    DrawerCloseButton: createMockComponent('DrawerCloseButton'),
    Popover: createMockComponent('Popover'),
    PopoverTrigger: createMockComponent('PopoverTrigger'),
    PopoverContent: createMockComponent('PopoverContent'),
    PopoverHeader: createMockComponent('PopoverHeader'),
    PopoverBody: createMockComponent('PopoverBody'),
    PopoverFooter: createMockComponent('PopoverFooter'),
    PopoverArrow: createMockComponent('PopoverArrow'),
    PopoverCloseButton: createMockComponent('PopoverCloseButton'),
    Tooltip: createMockComponent('Tooltip'),
    AlertDialog: createMockComponent('AlertDialog'),
    AlertDialogOverlay: createMockComponent('AlertDialogOverlay'),
    AlertDialogContent: createMockComponent('AlertDialogContent'),
    AlertDialogHeader: createMockComponent('AlertDialogHeader'),
    AlertDialogBody: createMockComponent('AlertDialogBody'),
    AlertDialogFooter: createMockComponent('AlertDialogFooter'),
    
    // Menu Components
    Menu: createMockComponent('Menu'),
    MenuButton: createMockComponent('MenuButton'),
    MenuList: createMockComponent('MenuList'),
    MenuItem: createMockComponent('MenuItem'),
    MenuGroup: createMockComponent('MenuGroup'),
    MenuDivider: createMockComponent('MenuDivider'),
    MenuItemOption: createMockComponent('MenuItemOption'),
    MenuOptionGroup: createMockComponent('MenuOptionGroup'),
    
    // Data Display
    Table: createMockComponent('Table'),
    Thead: createMockComponent('Thead'),
    Tbody: createMockComponent('Tbody'),
    Tfoot: createMockComponent('Tfoot'),
    Tr: createMockComponent('Tr'),
    Th: createMockComponent('Th'),
    Td: createMockComponent('Td'),
    TableCaption: createMockComponent('TableCaption'),
    Badge: createMockComponent('Badge'),
    Tag: createMockComponent('Tag'),
    TagLabel: createMockComponent('TagLabel'),
    TagLeftIcon: createMockComponent('TagLeftIcon'),
    TagRightIcon: createMockComponent('TagRightIcon'),
    TagCloseButton: createMockComponent('TagCloseButton'),
    Avatar: createMockComponent('Avatar'),
    AvatarBadge: createMockComponent('AvatarBadge'),
    AvatarGroup: createMockComponent('AvatarGroup'),
    Card: createMockComponent('Card'),
    CardHeader: createMockComponent('CardHeader'),
    CardBody: createMockComponent('CardBody'),
    CardFooter: createMockComponent('CardFooter'),
    Code: createMockComponent('Code'),
    Kbd: createMockComponent('Kbd'),
    List: createMockComponent('List'),
    ListItem: createMockComponent('ListItem'),
    ListIcon: createMockComponent('ListIcon'),
    OrderedList: createMockComponent('OrderedList'),
    UnorderedList: createMockComponent('UnorderedList'),
    Stat: createMockComponent('Stat'),
    StatLabel: createMockComponent('StatLabel'),
    StatNumber: createMockComponent('StatNumber'),
    StatHelpText: createMockComponent('StatHelpText'),
    StatArrow: createMockComponent('StatArrow'),
    StatGroup: createMockComponent('StatGroup'),
    
    // Tabs
    Tabs: createMockComponent('Tabs'),
    TabList: createMockComponent('TabList'),
    Tab: createMockComponent('Tab'),
    TabPanels: createMockComponent('TabPanels'),
    TabPanel: createMockComponent('TabPanel'),
    
    // Feedback
    Alert: createMockComponent('Alert'),
    AlertIcon: createMockComponent('AlertIcon'),
    AlertTitle: createMockComponent('AlertTitle'),
    AlertDescription: createMockComponent('AlertDescription'),
    CircularProgress: createMockComponent('CircularProgress'),
    CircularProgressLabel: createMockComponent('CircularProgressLabel'),
    Progress: createMockComponent('Progress'),
    Skeleton: createMockComponent('Skeleton'),
    SkeletonCircle: createMockComponent('SkeletonCircle'),
    SkeletonText: createMockComponent('SkeletonText'),
    Spinner: createMockComponent('Spinner'),
    
    // Other Components
    Image: createMockComponent('Image'),
    Link: createMockComponent('Link'),
    Icon: createMockComponent('Icon'),
    Divider: createMockComponent('Divider'),
    Accordion: createMockComponent('Accordion'),
    AccordionItem: createMockComponent('AccordionItem'),
    AccordionButton: createMockComponent('AccordionButton'),
    AccordionPanel: createMockComponent('AccordionPanel'),
    AccordionIcon: createMockComponent('AccordionIcon'),
    Breadcrumb: createMockComponent('Breadcrumb'),
    BreadcrumbItem: createMockComponent('BreadcrumbItem'),
    BreadcrumbLink: createMockComponent('BreadcrumbLink'),
    BreadcrumbSeparator: createMockComponent('BreadcrumbSeparator'),
    CloseButton: createMockComponent('CloseButton'),
    VisuallyHidden: createMockComponent('VisuallyHidden'),
    Portal: ({ children }) => children,
    Show: ({ children }) => children,
    Hide: () => null,
  }

  // Return a Proxy that provides explicit mocks first, then falls back to auto-generated ones
  return new Proxy(explicitMocks, {
    get: (target, prop) => {
      // If we have an explicit mock, return it
      if (prop in target) {
        return target[prop]
      }
      
      // For any unknown property, determine if it's a component or hook
      const propStr = String(prop)
      
      // Hooks (start with 'use')
      if (propStr.startsWith('use')) {
        return jest.fn(() => ({}))
      }
      
      // Components (start with uppercase letter)
      if (propStr[0] === propStr[0].toUpperCase()) {
        return createMockComponent(propStr)
      }
      
      // For anything else, return undefined
      return undefined
    }
  })
})

// Mock puppeteer for browser automation tests
jest.mock('puppeteer', () => ({
  launch: jest.fn(() => Promise.resolve({
    newPage: jest.fn(() => Promise.resolve({
      goto: jest.fn(),
      setViewport: jest.fn(),
      screenshot: jest.fn(),
      evaluate: jest.fn(),
      close: jest.fn(),
    })),
    close: jest.fn(),
  })),
}))

// Mock ical.js for calendar parsing
jest.mock('ical.js', () => {
  class Component {
    constructor() {
      this.properties = new Map()
    }
    getFirstPropertyValue(name) {
      return this.properties.get(name) || null
    }
    getFirstProperty(name) {
      return {
        getFirstValue: () => this.getFirstPropertyValue(name),
        getValues: () => [this.getFirstPropertyValue(name)],
      }
    }
    getAllProperties(name) {
      return []
    }
    getAllSubcomponents(name) {
      return []
    }
    getFirstSubcomponent(name) {
      return null
    }
  }
  
  return {
    Component,
    parse: jest.fn(() => ({})),
    Time: jest.fn(function() {
      this.toString = () => '2024-01-01T00:00:00Z'
      this.toJSDate = () => new Date('2024-01-01T00:00:00Z')
      return this
    }),
    Event: jest.fn(),
    Property: jest.fn(),
  }
})

// Mock googleapis for Google Calendar integration
jest.mock('googleapis', () => ({
  google: {
    calendar: jest.fn(() => ({
      events: {
        list: jest.fn(() => Promise.resolve({ data: { items: [] } })),
        insert: jest.fn(() => Promise.resolve({ data: {} })),
        update: jest.fn(() => Promise.resolve({ data: {} })),
        delete: jest.fn(() => Promise.resolve({ data: {} })),
        get: jest.fn(() => Promise.resolve({ data: {} })),
      },
      calendarList: {
        list: jest.fn(() => Promise.resolve({ data: { items: [] } })),
        get: jest.fn(() => Promise.resolve({ data: {} })),
        insert: jest.fn(() => Promise.resolve({ data: {} })),
        update: jest.fn(() => Promise.resolve({ data: {} })),
        delete: jest.fn(() => Promise.resolve({ data: {} })),
      },
      calendars: {
        get: jest.fn(() => Promise.resolve({ data: {} })),
      },
      freebusy: {
        query: jest.fn(() => Promise.resolve({ data: { calendars: {} } })),
      },
    })),
    auth: {
      OAuth2: jest.fn(function() {
        this.setCredentials = jest.fn()
        this.getAccessToken = jest.fn((callback) => callback(null, 'mock-token'))
        return this
      }),
    },
  },
}))

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

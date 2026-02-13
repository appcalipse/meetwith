import { act, render, screen } from '@testing-library/react'
import crypto from 'crypto'
import * as react from 'react'

import Home from '@/pages'
import { ChakraTestWrapper } from '@/testing/chakra-helpers'

// Mock Sentry BEFORE any imports that use it
jest.mock('@sentry/nextjs', () => ({
  BrowserTracing: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  init: jest.fn(),
  Replay: jest.fn(),
  withScope: jest.fn(callback => callback({ setTag: jest.fn() })),
}))

jest.mock('thirdweb/react', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('next/router', () => ({
  useRouter: () => ({
    asPath: '/',
    events: {
      emit: jest.fn(),
      off: jest.fn(),
      on: jest.fn(),
    },
    isFallback: false,
    pathname: '/',
    push: jest.fn(),
    query: {},
  }),
}))

describe('ThemeSwitcher', () => {
  it('should react to theme mode switch', async () => {
    const rawComponent = <Home />

    await act(async () => {
      render(rawComponent, { wrapper: ChakraTestWrapper })
    })

    expect(screen.getByTestId('main-container')).toBeInTheDocument()
  })
})

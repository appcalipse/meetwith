import { act, render, screen } from '@testing-library/react'
import crypto from 'crypto'
import * as react from 'react'

import Home from '@/pages'
import { ChakraTestWrapper } from '@/testing/chakra-helpers'

// Mock Sentry BEFORE any imports that use it
jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  withScope: jest.fn(callback => callback({ setTag: jest.fn() })),
  init: jest.fn(),
  BrowserTracing: jest.fn(),
  Replay: jest.fn(),
}))

jest.mock('thirdweb/react', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
    isFallback: false,
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

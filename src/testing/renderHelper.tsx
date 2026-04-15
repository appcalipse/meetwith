/**
 * Rendering helpers for component tests
 * 
 * Provides utilities to safely render components in test environment
 * with all necessary providers and context
 */

import { ChakraProvider } from '@chakra-ui/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, RenderOptions } from '@testing-library/react'
import React, { ReactElement } from 'react'

import customTheme from '../styles/theme'

/**
 * Creates a wrapper with all necessary providers for testing
 */
export const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider
        theme={{
          ...customTheme,
          config: { ...customTheme.config, initialColorMode: 'dark' },
        }}
      >
        {children}
      </ChakraProvider>
    </QueryClientProvider>
  )
}

/**
 * Custom render function that wraps components in all necessary providers
 */
export const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return render(ui, { wrapper: AllTheProviders, ...options })
}

/**
 * Safe render function that catches errors and reports them cleanly
 * Useful for smoke tests where we just want to verify component doesn't crash
 */
export const renderSafely = (
  component: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): { success: boolean; error?: Error; result?: ReturnType<typeof render> } => {
  try {
    const result = renderWithProviders(component, options)
    return { success: true, result }
  } catch (error) {
    return { success: false, error: error as Error }
  }
}

/**
 * Renders a component and asserts it doesn't throw
 * Returns the render result for further assertions
 */
export const renderWithoutError = (
  component: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  const { success, error, result } = renderSafely(component, options)
  
  if (!success) {
    throw new Error(`Component failed to render: ${error?.message}`)
  }
  
  return result!
}

/**
 * Helper to create minimal props for components
 * Useful for smoke tests where we just need valid props
 */
export const createMinimalProps = <T extends Record<string, unknown>>(
  overrides?: Partial<T>
): T => {
  return {
    ...overrides,
  } as T
}

// Re-export everything from @testing-library/react for convenience
export * from '@testing-library/react'

import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

let mockColorMode = 'dark'

jest.mock('@chakra-ui/color-mode', () => ({
  ...jest.requireActual('@chakra-ui/color-mode'),
  useColorMode: () => ({
    colorMode: mockColorMode,
    toggleColorMode: () => {
      mockColorMode = mockColorMode === 'dark' ? 'light' : 'dark'
    },
  }),
  useColorModeValue: (light: any, dark: any) =>
    mockColorMode === 'light' ? light : dark,
}))

jest.mock('../../../utils/analytics', () => ({ logEvent: jest.fn() }))

import { ThemeSwitcher } from '../../../components/ThemeSwitcher'
import { ChakraTestWrapper } from '../../../testing/chakra-helpers'

describe('ThemeSwitcher', () => {
  beforeEach(() => {
    mockColorMode = 'dark'
    // Suppress Chakra UI prop warnings (e.g., isChecked on DOM element)
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should react to theme mode switch', () => {
    const { rerender } = render(<ThemeSwitcher />, {
      wrapper: ChakraTestWrapper,
    })

    // Initial: dark mode → shows light-mode (sun) icon
    expect(screen.getByTestId('light-mode')).toBeInTheDocument()

    // Click the mobile toggle button (parent of icon) which calls doToggle
    fireEvent.click(screen.getByTestId('light-mode').parentElement!)

    // Re-render to reflect the updated mock color mode
    rerender(
      <ChakraTestWrapper>
        <ThemeSwitcher />
      </ChakraTestWrapper>
    )

    // After toggle: light mode → shows dark-mode (moon) icon
    expect(screen.getByTestId('dark-mode')).toBeInTheDocument()
  })
})

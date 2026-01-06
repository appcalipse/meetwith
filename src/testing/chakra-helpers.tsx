import { ChakraProvider } from '@chakra-ui/react'
import React from 'react'

import customTheme from '../styles/theme'

export const ChakraTestWrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <ChakraProvider
    theme={{
      ...customTheme,
      config: { ...customTheme.config, initialColorMode: 'dark' },
    }}
  >
    {children}
  </ChakraProvider>
)

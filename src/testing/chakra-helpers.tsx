import { ChakraProvider } from '@chakra-ui/react'
import React from 'react'

import customTheme from '../styles/theme'

export const ChakraTestWrapper: React.FC = ({ children }) => (
  <ChakraProvider theme={customTheme}>{children}</ChakraProvider>
)

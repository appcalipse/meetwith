import { Box } from '@chakra-ui/react'
import React from 'react'

import Footer from '../components/Footer'
import { Navbar } from '../components/Navbar'

export const BaseLayout: React.FC = ({ children }) => {
  return (
    <Box pt={'76px'}>
      <Navbar />
      {children}
      <Footer />
    </Box>
  )
}

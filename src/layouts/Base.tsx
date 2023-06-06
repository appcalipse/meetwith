import { Box } from '@chakra-ui/react'
import React from 'react'

import Footer from '../components/Footer'
import { Navbar } from '../components/Navbar'

export const BaseLayout: React.FC<{ children: any }> = ({ children }) => {
  return (
    <Box minH="100vh" display="flex" flexDir="column">
      <Navbar />
      {children}
      <Footer />
    </Box>
  )
}

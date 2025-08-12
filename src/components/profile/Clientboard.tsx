import { Box, Heading, Text, useColorModeValue, VStack } from '@chakra-ui/react'
import React from 'react'

import { Account } from '@/types/Account'

interface ClientboardProps {
  currentAccount: Account
}

const Clientboard: React.FC<ClientboardProps> = () => {
  const bgColor = useColorModeValue('white', 'neutral.900')
  const textColor = useColorModeValue('gray.800', 'gray.200')

  return (
    <Box
      bg={bgColor}
      borderRadius="lg"
      p={8}
      boxShadow="sm"
      border="1px solid"
      borderColor={useColorModeValue('gray.200', 'gray.700')}
    >
      <VStack spacing={6} align="start">
        <Heading size="lg" color={textColor}>
          Clientboard
        </Heading>
        <Text color={textColor}>
          Welcome to your clientboard! This is where you&apos;ll be able to
          manage your client relationships and transactions. Feature coming
          soon.
        </Text>
      </VStack>
    </Box>
  )
}

export default Clientboard

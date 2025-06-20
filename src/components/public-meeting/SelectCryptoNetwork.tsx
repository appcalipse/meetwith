import { Heading, Text, VStack } from '@chakra-ui/react'
import React from 'react'

const SelectCryptoNetwork = () => {
  return (
    <VStack alignItems="flex-start" w={'100%'}>
      <Heading size="lg">Make your Payment</Heading>
      <Text fontWeight={700}>Select payment method</Text>
    </VStack>
  )
}

export default SelectCryptoNetwork

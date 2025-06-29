import { Heading, HStack, Text, VStack } from '@chakra-ui/react'
import ChainLogo from '@components/icons/ChainLogo'
import FiatLogo from '@components/icons/FiatLogo'
import PaymentMethod from '@components/public-meeting/PaymentMethod'
import { PaymentStep, PaymentType } from '@utils/constants/meeting-types'
import React from 'react'

const paymentMethods = [
  {
    id: 'pay-with-card',
    name: 'Pay with Card',
    tag: 'Your fiat cards',
    step: PaymentStep.CONFIRM_PAYMENT,
    icon: FiatLogo,
    type: PaymentType.FIAT,
    disabled: true,
  },
  {
    id: 'pay-with-crypto',
    name: 'Pay with Crypto',
    step: PaymentStep.SELECT_CRYPTO_NETWORK,
    icon: ChainLogo,
    type: PaymentType.CRYPTO,
  },
]

const MakeYourPayment = () => {
  return (
    <VStack alignItems="flex-start" w={'100%'}>
      <Heading size="lg">Make your Payment</Heading>
      <Text fontWeight={700}>Select payment method</Text>
      <HStack
        w={{ base: '100%', md: '70%' }}
        alignItems="stretch"
        h={'fit-content'}
        gap={8}
        mt={4}
      >
        {paymentMethods.map(method => (
          <PaymentMethod key={method.id} {...method} />
        ))}
      </HStack>
    </VStack>
  )
}

export default MakeYourPayment

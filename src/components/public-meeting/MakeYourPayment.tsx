import { Button, Heading, HStack, Tag, Text, VStack } from '@chakra-ui/react'
import ChainLogo from '@components/icons/ChainLogo'
import FiatLogo from '@components/icons/FiatLogo'
import { PublicScheduleContext } from '@components/public-meeting/index'
import { PaymentStep, PaymentType } from '@utils/constants/meeting-types'
import React, { useContext } from 'react'

const paymentMethods = [
  {
    id: 'pay-with-card',
    name: 'Pay with Card',
    tag: 'Your fiat cards',
    step: PaymentStep.CONFIRM_PAYMENT,
    icon: FiatLogo,
    type: PaymentType.FIAT,
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
  const { handleSelectPaymentMethod } = useContext(PublicScheduleContext)

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
          <VStack
            key={method.id}
            p={4}
            rounded={'lg'}
            alignItems={'flex-start'}
            flex={1}
            flexBasis="0%"
            gap={6}
            height="auto"
            justifyContent="space-between"
            borderWidth={1}
            borderColor={'neutral.400'}
            w={'50%'}
          >
            <method.icon width={'auto'} h={'auto'} />
            <VStack gap={4} w={'100%'} alignItems={'flex-start'}>
              {method.tag && (
                <Tag fontSize="sm" bg="#2D3748">
                  {method.tag}
                </Tag>
              )}
              <Button
                colorScheme="primary"
                w={'full'}
                onClick={() =>
                  handleSelectPaymentMethod(method.type, method.step)
                }
              >
                {method.name}
              </Button>
            </VStack>
          </VStack>
        ))}
      </HStack>
    </VStack>
  )
}

export default MakeYourPayment

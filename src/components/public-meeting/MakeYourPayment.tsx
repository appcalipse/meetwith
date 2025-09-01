import { ArrowBackIcon } from '@chakra-ui/icons'
import { Heading, HStack, Text, useDisclosure, VStack } from '@chakra-ui/react'
import ChainLogo from '@components/icons/ChainLogo'
import FiatLogo from '@components/icons/FiatLogo'
import InvoiceIcon from '@components/icons/InvoiceIcon'
import { PublicScheduleContext } from '@components/public-meeting/index'
import PaymentMethod from '@components/public-meeting/PaymentMethod'
import {
  PaymentStep,
  PaymentType,
  PublicSchedulingSteps,
} from '@utils/constants/meeting-types'
import { subscribeToMessages } from '@utils/pub-sub.helper'
import { useRouter } from 'next/router'
import React, { useContext, useEffect, useMemo } from 'react'
import { v4 } from 'uuid'

import CheckoutWidgetModal from './CheckoutWidgetModal'

const MakeYourPayment = () => {
  const { setCurrentStep, selectedType } = useContext(PublicScheduleContext)
  const handleBack = () => {
    setCurrentStep(PublicSchedulingSteps.BOOK_SESSION)
  }
  const { query } = useRouter()

  const messageChannel = useMemo(
    () => `onramp:${v4()}:${selectedType?.id || ''}`,
    [selectedType]
  )
  const { isOpen, onOpen, onClose } = useDisclosure()
  const paymentMethods = useMemo(() => {
    const methods = [
      {
        id: 'pay-with-crypto',
        name: 'Pay with Crypto',
        step: PaymentStep.SELECT_CRYPTO_NETWORK,
        icon: ChainLogo,
        type: PaymentType.CRYPTO,
        onClick: onOpen,
      },
      {
        id: 'pay-with-card',
        name: 'Pay with Card',
        tag: 'Your fiat cards',
        step: PaymentStep.CONFIRM_PAYMENT,
        icon: FiatLogo,
        type: PaymentType.FIAT,
      },
      {
        id: 'pay-with-invoice',
        name: 'Pay via Invoice',
        step: PaymentStep.HANDLE_SEND_INVOICE,
        icon: InvoiceIcon,
        type: PaymentType.FIAT,
      },
    ]
    if (query.type === 'direct-invoice') {
      return methods.filter(
        method => method.step !== PaymentStep.HANDLE_SEND_INVOICE
      )
    }
    return methods
  }, [query])

  return (
    <VStack alignItems="flex-start" w={'100%'}>
      <HStack
        color={'primary.400'}
        onClick={handleBack}
        left={6}
        w={'fit-content'}
        cursor="pointer"
        role={'button'}
      >
        <ArrowBackIcon w={6} h={6} />
        <Text fontSize={16}>Back</Text>
      </HStack>
      <CheckoutWidgetModal
        messageChannel={messageChannel}
        isOpen={isOpen}
        onClose={onClose}
      />
      <Heading size="lg">Make your Payment</Heading>
      <Text fontWeight={700}>Select payment method</Text>
      <HStack
        w={{ base: '100%', md: '70%' }}
        alignItems="stretch"
        h={'fit-content'}
        gap={8}
        mt={4}
        flexWrap={{
          base: 'wrap',
          md: 'nowrap',
        }}
      >
        {paymentMethods.map(method => (
          <PaymentMethod key={method.id} {...method} />
        ))}
      </HStack>
    </VStack>
  )
}

export default MakeYourPayment

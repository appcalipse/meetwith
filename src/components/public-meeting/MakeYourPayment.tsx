import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Heading,
  HStack,
  Text,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react'
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
import { useRouter } from 'next/router'
import React, { useContext, useMemo, useState } from 'react'
import { v4 } from 'uuid'

import useAccountContext from '@/hooks/useAccountContext'
import { useSmartReconnect } from '@/hooks/useSmartReconnect'
import { getUserLocale } from '@/utils/api_helper'

import CheckoutWidgetModal from './CheckoutWidgetModal'

const MakeYourPayment = () => {
  const { setCurrentStep, selectedType } = useContext(PublicScheduleContext)
  const toast = useToast()
  const currentAccount = useAccountContext()
  const { needsReconnection, attemptReconnection } = useSmartReconnect()
  const [country, setCountry] = useState<string | undefined>()
  const handleBack = () => {
    setCurrentStep(PublicSchedulingSteps.BOOK_SESSION)
  }
  const { query } = useRouter()

  const messageChannel = useMemo(
    () => `onramp:${v4()}:${selectedType?.id || ''}`,
    [selectedType]
  )
  const { isOpen, onOpen, onClose } = useDisclosure()
  const handleOpen = async () => {
    if ((selectedType?.plan?.no_of_slot || 0) > 1) {
      toast({
        title: 'Account Not Found',
        description:
          'You have to be logged in to pay for multiple slots, Please login to proceed.',
        status: 'error',
      })
      return
    }
    if (currentAccount?.address && needsReconnection) {
      await attemptReconnection()
    }
    await getUserLocale()
      .then(data => setCountry(data.country))
      .catch(() => setCountry(undefined))

    onOpen()
  }
  const paymentMethods = useMemo(() => {
    const methods = [
      {
        id: 'pay-with-crypto',
        name: 'Pay with Crypto',
        step: PaymentStep.SELECT_CRYPTO_NETWORK,
        icon: ChainLogo,
        type: PaymentType.CRYPTO,
        onClick: handleOpen,
        loading: isOpen,
      },
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
  }, [query, isOpen])

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
        country={country}
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

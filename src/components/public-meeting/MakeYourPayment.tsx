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
import {
  PublicScheduleContext,
  ScheduleStateContext,
} from '@components/public-meeting/index'
import PaymentMethod from '@components/public-meeting/PaymentMethod'
import {
  PaymentRedirectType,
  PaymentStep,
  PaymentType,
  PublicSchedulingSteps,
} from '@utils/constants/meeting-types'
import { useRouter } from 'next/router'
import React, { useContext, useMemo, useState } from 'react'
import { v4 } from 'uuid'

import useAccountContext from '@/hooks/useAccountContext'
import { useSmartReconnect } from '@/hooks/useSmartReconnect'
import { MeetingCheckoutRequest } from '@/types/Requests'
import { generateCheckoutLink, getUserLocale } from '@/utils/api_helper'
import { getAccountDomainUrl } from '@/utils/calendar_manager'
import { appUrl } from '@/utils/constants'

import CheckoutWidgetModal from './CheckoutWidgetModal'

const MakeYourPayment = () => {
  const { setCurrentStep, selectedType, account } = useContext(
    PublicScheduleContext
  )
  const toast = useToast()
  const {
    participants,
    meetingProvider,
    meetingNotification,
    meetingRepeat,
    content,
    name,
    title,
    doSendEmailReminders,
    scheduleType,
    userEmail,
    meetingUrl,
    pickedTime,
    guestEmail,
    timezone,
  } = useContext(ScheduleStateContext)
  const currentAccount = useAccountContext()
  const { needsReconnection, attemptReconnection } = useSmartReconnect()
  const [country, setCountry] = useState<string | undefined>()
  const handleBack = () => {
    setCurrentStep(PublicSchedulingSteps.BOOK_SESSION)
  }
  const handleFiatPayment = async () => {
    const baseUrl = `${appUrl}/${getAccountDomainUrl(account)}/${
      selectedType?.slug || ''
    }`

    const params = new URLSearchParams({
      payment_type: PaymentType.FIAT,
      title,
      name,
      email: guestEmail,
      schedule_type: String(scheduleType),
      meeting_provider: meetingProvider,
      content,
      participants: JSON.stringify(participants),
      meeting_notification: meetingNotification.map(val => val.value).join(','),
      meeting_repeat: meetingRepeat.value,
      do_send_email_reminders: String(doSendEmailReminders),
      picked_time: pickedTime?.toISOString() || '',
      meeting_url: meetingUrl,
      user_email: userEmail,
      type: PaymentRedirectType.CHECKOUT,
      timezone: timezone.value || '',
    })
    const url = `${baseUrl}?${params.toString()}`
    const amount =
      (selectedType?.plan?.price_per_slot || 0) *
      (selectedType?.plan?.no_of_slot || 0)
    const payload: MeetingCheckoutRequest = {
      amount,
      guest_address: currentAccount?.address,
      guest_email: guestEmail,
      guest_name: name,
      meeting_type_id: selectedType?.id || '',
      redirectUrl: url,
    }
    const checkOutUrl = await generateCheckoutLink(payload)
    window.open(checkOutUrl, '_self', 'noopener noreferrer')
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
    const methods = []
    if (account.payment_methods?.includes(PaymentType.CRYPTO)) {
      methods.push({
        id: 'pay-with-crypto',
        name: 'Pay with Crypto',
        step: PaymentStep.SELECT_CRYPTO_NETWORK,
        icon: ChainLogo,
        type: PaymentType.CRYPTO,
        onClick: handleOpen,
        loading: isOpen,
      })
    }
    if (account.payment_methods?.includes(PaymentType.FIAT)) {
      methods.push({
        id: 'pay-with-card',
        name: 'Pay with Card',
        tag: 'Your fiat cards',
        step: PaymentStep.CONFIRM_PAYMENT,
        icon: FiatLogo,
        type: PaymentType.FIAT,
        onClick: handleFiatPayment,
      })
    }
    if (query.type !== PaymentRedirectType.INVOICE) {
      methods.push({
        id: 'pay-with-invoice',
        name: 'Pay via Invoice',
        step: PaymentStep.HANDLE_SEND_INVOICE,
        icon: InvoiceIcon,
        type: PaymentType.FIAT,
      })
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

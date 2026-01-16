import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Heading,
  HStack,
  Input,
  Text,
  useToast,
  VStack,
} from '@chakra-ui/react'
import {
  PublicScheduleContext,
  ScheduleStateContext,
} from '@components/public-meeting/index'
import PaymentDetails from '@components/public-meeting/PaymentDetails'
import { requestInvoice } from '@utils/api_helper'
import { getAccountDomainUrl } from '@utils/calendar_manager'
import { appUrl } from '@utils/constants'
import {
  PaymentRedirectType,
  PaymentStep,
  PaymentType,
} from '@utils/constants/meeting-types'
import {
  ErrorAction,
  ErrorState,
  errorReducerSingle,
  PaymentInfo,
  validatePaymentInfo,
} from '@utils/schemas'
import React, { Reducer, useContext } from 'react'

const PayViaInvoice = () => {
  const {
    setPaymentStep,
    selectedType,
    paymentType,
    account,
    chain: selectedChain,
    token,
  } = useContext(PublicScheduleContext)
  const {
    participants,
    meetingProvider,
    meetingNotification,
    meetingRepeat,
    content,
    name,
    setName,
    title,
    doSendEmailReminders,
    scheduleType,
    userEmail,
    meetingUrl,
    pickedTime,
    timezone,
    guestEmail,
  } = useContext(ScheduleStateContext)
  const [isInvoiceLoading, setIsInvoiceLoading] = React.useState(false)
  const toast = useToast({ position: 'top', isClosable: true })

  const [email, setEmail] = React.useState(guestEmail)
  const [errors, dispatchErrors] = React.useReducer<
    Reducer<
      ErrorState<keyof PaymentInfo, '', never>,
      ErrorAction<keyof PaymentInfo>
    >
  >(errorReducerSingle, {})
  const handleBack = () => {
    setPaymentStep(PaymentStep.SELECT_PAYMENT_METHOD)
  }
  const handleBlur = (field: keyof PaymentInfo, value: string) => {
    const { isValid, error } = validatePaymentInfo(field, value)
    if (!isValid && error) {
      dispatchErrors({
        type: 'SET_ERROR',
        field,
        message: error,
      })
    } else {
      dispatchErrors({ type: 'CLEAR_ERROR', field })
    }
  }
  const handleRequestInvoice = async () => {
    setIsInvoiceLoading(true)
    try {
      const baseUrl = `${appUrl}/${getAccountDomainUrl(account)}/${
        selectedType?.slug || ''
      }`

      const params = new URLSearchParams({
        payment_type: paymentType || '',
        title,
        name,
        email,
        schedule_type: String(scheduleType),
        meeting_provider: meetingProvider,
        content,
        participants: JSON.stringify(participants),
        meeting_notification: meetingNotification
          .map(val => val.value)
          .join(','),
        meeting_repeat: meetingRepeat.value,
        do_send_email_reminders: String(doSendEmailReminders),
        picked_time: pickedTime?.toISOString() || '',
        guest_email: email,
        meeting_url: meetingUrl,
        user_email: userEmail,
        timezone: timezone.value || '',
        type: PaymentRedirectType.INVOICE,
      })

      if (paymentType === PaymentType.CRYPTO && token && selectedChain) {
        params.append('token', token)
        params.append('chain', selectedChain)
      }

      const url = `${baseUrl}?${params.toString()}`

      const response = await requestInvoice({
        guest_email: email,
        guest_name: name,
        meeting_type_id: selectedType?.id || '',
        payment_method: paymentType || PaymentType.FIAT,
        url,
      })
      if (response.success) {
        toast({
          title: 'Invoice Requested',
          description:
            "We've received your invoice request! It'll be sent to your email shortly.",
          status: 'success',
          duration: 5000,
        })
      }
    } catch (error) {
      console.error('Error requesting invoice:', error)
      if (error instanceof Error) {
        toast({
          title: 'Invoice Request Failed',
          description:
            error.message || 'An error occurred while requesting the invoice.',
          status: 'error',
          duration: 5000,
        })
      }
    }
    setIsInvoiceLoading(false)
  }

  return (
    <VStack alignItems="flex-start" w="100%" gap={6}>
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
      <VStack alignItems="flex-start">
        <Heading size="md" fontSize="24px">
          Confirm Payment Info to Receive Invoice
        </Heading>
        <Text>
          The invoice will be sent to this email addresses and addressed to this
          names. Same as the receipt of payment
        </Text>
      </VStack>
      <VStack alignItems="flex-start" w="100%">
        <Heading size="md" fontSize="24px">
          Session owners detail
        </Heading>
        <Text>
          Here you provide your details or whoever is taking the session
        </Text>
        <VStack alignItems="flex-start" w={{ base: '100%', md: '40%' }} gap={4}>
          <FormControl
            width={'100%'}
            justifyContent={'space-between'}
            alignItems="flex-start"
            isInvalid={!!errors.name}
          >
            <FormLabel fontSize={'16px'}>Full name</FormLabel>
            <Input
              placeholder="Enter your full name"
              borderColor="neutral.400"
              width={'max-content'}
              w="100%"
              errorBorderColor="red.500"
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={() => handleBlur('name', name)}
            />
            {!!errors.name && (
              <FormErrorMessage>{errors.name}</FormErrorMessage>
            )}
          </FormControl>
          <FormControl
            width={'100%'}
            justifyContent={'space-between'}
            alignItems="flex-start"
            isInvalid={!!errors.email}
          >
            <FormLabel fontSize={'16px'}>Email address</FormLabel>
            <Input
              placeholder="Enter your email address"
              borderColor="neutral.400"
              width={'max-content'}
              w="100%"
              errorBorderColor="red.500"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onBlur={() => handleBlur('email', email)}
            />
            {!!errors.email && (
              <FormErrorMessage>{errors.email}</FormErrorMessage>
            )}
          </FormControl>
        </VStack>
      </VStack>
      <VStack alignItems="flex-start" w="100%">
        <Heading size="md" fontSize="24px">
          Plan & Payment detail
        </Heading>
        <Text mb={4}>Summary of the plan and payment info</Text>
        <PaymentDetails />
      </VStack>{' '}
      <Button
        colorScheme="primary"
        isDisabled={!name || !email || !!errors.name || !!errors.email}
        onClick={() => handleRequestInvoice()}
        isLoading={isInvoiceLoading}
      >
        Get Invoice
      </Button>
    </VStack>
  )
}

export default PayViaInvoice

import { Box, Button, HStack, Text, VStack } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import React, { useContext, useEffect, useMemo, useRef } from 'react'
import Countdown, { CountdownRenderProps } from 'react-countdown'

import usePoller from '@/hooks/usePoller'
import { MeetingReminders } from '@/types/common'
import { getTransactionById, getTransactionStatus } from '@/utils/api_helper'
import { PaymentStatus, PaymentType } from '@/utils/constants/meeting-types'
import { formatCurrency } from '@/utils/generic_utils'
import { useToastHelpers } from '@/utils/toasts'

import Loading from '../Loading'
import { PublicScheduleContext, ScheduleStateContext } from '.'

const getIconColor = (status?: PaymentStatus) => {
  switch (status) {
    case PaymentStatus.COMPLETED:
      return 'green.500'
    case PaymentStatus.PENDING:
      return 'yellow.400'
    case PaymentStatus.FAILED:
    case PaymentStatus.CANCELLED:
      return 'red.500'
    default:
      return 'yellow.400'
  }
}
const FiatPaymentVerifying = () => {
  const { selectedType, paymentType, handleNavigateToBook, tx } = useContext(
    PublicScheduleContext
  )
  const [isScheduling, setIsScheduling] = React.useState(false)
  const {
    confirmSchedule,
    participants,
    meetingProvider,
    meetingNotification,
    meetingRepeat,
    content,
    name,
    title,
    doSendEmailReminders,
    scheduleType,
    meetingUrl,
    pickedTime,
    userEmail,
    guestEmail,
  } = useContext(ScheduleStateContext)
  const { query } = useRouter()
  const { showErrorToast, showSuccessToast } = useToastHelpers()
  const countDownRef = useRef<number>(0)
  const {
    data: transactionData,
    isLoading,
    refetch,
  } = useQuery({
    queryFn: () => getTransactionById(query.transaction_id as string),
    enabled: !!query.transaction_id,
    staleTime: 0,
    refetchOnMount: true,
  })
  const poll = usePoller()

  const DETAILS = useMemo(
    () => [
      {
        label: 'Plan',
        value: selectedType?.title,
      },
      {
        label: 'Number of Sessions',
        value: `${selectedType?.plan?.no_of_slot} sessions`,
      },
      {
        label: 'Price',
        value: selectedType?.plan
          ? formatCurrency(
              selectedType?.plan?.price_per_slot *
                selectedType?.plan?.no_of_slot,
              'USD',
              2
            )
          : '$0',
      },
      {
        label: 'Payment Method',
        value: paymentType === PaymentType.FIAT ? 'Card' : 'Crypto',
      },
      {
        label: 'Transaction status',
        value: transactionData?.status,
        isStatus: true,
      },
      {
        label: 'Payment Reference',
        value: transactionData?.transaction_hash,
      },
    ],
    [paymentType, selectedType?.plan, transactionData]
  )
  const handleConfirmation = async () => {
    if (countDownRef.current) return
    const abortController = new AbortController()
    const timeoutMs = 10 * 60 * 1000 // 10 minutes
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    countDownRef.current = Date.now() + timeoutMs
    try {
      await Promise.race([
        poll(
          async () => {
            const status = await getTransactionStatus(
              query.transaction_id as string
            )
            if (
              [PaymentStatus.CANCELLED, PaymentStatus.FAILED].includes(status)
            ) {
              showErrorToast('Error', 'Payment failed or was cancelled.')
              abortController.abort()
            }
            if (
              status === PaymentStatus.COMPLETED &&
              transactionData?.transaction_hash
            ) {
              handleNavigateToBook(transactionData?.transaction_hash)
              showSuccessToast(
                'Payment verified',
                'Your payment has been verified successfully.'
              )
            }
            return { completed: status === PaymentStatus.COMPLETED }
          },
          abortController.signal,
          5000
        ),
        new Promise(_res => {
          timeoutId = setTimeout(() => {
            showErrorToast(
              'Error',
              'Payment verification timed out. Please try again.'
            )
            countDownRef.current = 0
            abortController.abort()
          }, timeoutMs)
        }),
      ])
      const transaction = await refetch()
      localStorage.setItem(
        `${selectedType?.id || ''}:transaction`,
        JSON.stringify(transaction.data)
      )
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }
  useEffect(() => {
    void handleConfirmation()
  }, [query.transaction_id])
  useEffect(() => {
    if (transactionData?.transaction_hash)
      handleNavigateToBook(transactionData?.transaction_hash)
  }, [transactionData?.transaction_hash])
  const handleSchedule = async () => {
    setIsScheduling(true)
    try {
      await confirmSchedule(
        scheduleType!,
        pickedTime!,
        guestEmail,
        name,
        content,
        meetingUrl,
        doSendEmailReminders ? userEmail : undefined,
        title,
        participants,
        meetingProvider,
        meetingNotification.map(n => n.value as MeetingReminders),
        meetingRepeat.value,
        tx
      )
    } finally {
      setIsScheduling(false)
    }
  }
  const renderer = ({ minutes, seconds }: CountdownRenderProps) => {
    return (
      <HStack alignItems="center" gap={2} h="100%" justifyContent={'center'}>
        <Text fontSize="lg" color="primary.400" fontWeight={700}>
          {minutes}:{seconds}
        </Text>
      </HStack>
    )
  }
  return isLoading ? (
    <Box mx="auto" mt={8}>
      <Loading />
    </Box>
  ) : (
    <VStack w="100%" gap={0}>
      {DETAILS.map((detail, index, arr) => (
        <HStack
          key={index}
          justifyContent="space-between"
          w="100%"
          alignItems="flex-start"
          py={7}
          borderTopWidth={index === 0 ? 1 : 0.5}
          borderBottomWidth={index === arr.length - 1 ? 0 : 0.5}
          borderColor="neutral.600"
        >
          <Text fontSize="medium" fontWeight={700} flexBasis="40%">
            {detail.label}
          </Text>
          <Text
            fontSize="medium"
            fontWeight={500}
            flexBasis="40%"
            color={
              detail.isStatus
                ? getIconColor(transactionData?.status)
                : 'inherit'
            }
            textTransform={detail.isStatus ? 'capitalize' : 'none'}
          >
            {detail.value}
          </Text>
        </HStack>
      ))}
      <HStack justifyContent="space-between" w="100%" mt={4}>
        <Button
          isLoading={isScheduling}
          onClick={handleSchedule}
          colorScheme="primary"
          isDisabled={transactionData?.status !== PaymentStatus.COMPLETED}
          _disabled={{
            bg: 'neutral.600',
            opacity: 0.6,
            cursor: 'not-allowed',
          }}
        >
          Schedule now
        </Button>
        {transactionData?.status !== PaymentStatus.COMPLETED && (
          <Countdown
            key={countDownRef.current}
            date={countDownRef.current}
            renderer={renderer}
          />
        )}
      </HStack>
    </VStack>
  )
}

export default FiatPaymentVerifying

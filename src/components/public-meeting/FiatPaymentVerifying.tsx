import { HStack, Text, VStack } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import React, { useContext, useMemo } from 'react'

import { getTransactionById } from '@/utils/api_helper'
import { PaymentType } from '@/utils/constants/meeting-types'
import { formatCurrency } from '@/utils/generic_utils'

import { PublicScheduleContext } from '.'

const FiatPaymentVerifying = () => {
  const { selectedType, paymentType } = useContext(PublicScheduleContext)
  const { query } = useRouter()

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
  const handlePolling = () => {}
  return (
    <VStack w="100%" gap={0}>
      {DETAILS.map((detail, index, arr) => (
        <HStack
          key={index}
          justifyContent="space-between"
          w="100%"
          alignItems="flex-start"
          py={7}
          borderTopWidth={index === 0 ? 1 : 0.5}
          borderBottomWidth={index === arr.length - 1 ? 1 : 0.5}
          borderColor="neutral.600"
        >
          <Text fontSize="medium" fontWeight={700} flexBasis="40%">
            {detail.label}
          </Text>
          <Text fontSize="medium" fontWeight={500} flexBasis="40%">
            {detail.value}
          </Text>
        </HStack>
      ))}
    </VStack>
  )
}

export default FiatPaymentVerifying

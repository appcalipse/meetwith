import { Box, Text, VStack } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import React, { useContext, useMemo } from 'react'

import Loading from '@/components/Loading'
import { PublicScheduleContext } from '@/components/public-meeting'
import ProgressHeader from '@/components/public-meeting/ProgressHeader'
import SchedulerPicker from '@/components/public-meeting/SchedulerPicker'
import SessionTypeCardPaymentInfo from '@/components/public-meeting/SessionTypeCardPaymentInfo'
import { getTransactionByTxHash } from '@/utils/api_helper'

const BookingComponent = () => {
  const { tx } = useContext(PublicScheduleContext)
  const { data: meetingSessions, isLoading } = useQuery({
    queryKey: ['transaction', tx],
    queryFn: () => tx && getTransactionByTxHash(tx),
    enabled: !!tx,
  })

  const availableSessions = useMemo(
    () => meetingSessions?.filter(session => !session.used_at).length ?? 0,

    [meetingSessions]
  )

  return (
    <VStack
      w={{ base: '100%', md: '90%', lg: '60%' }}
      alignItems={{ md: 'flex-start', base: 'center' }}
      marginX={'auto'}
      px={'4'}
      gap={9}
    >
      <ProgressHeader />
      <SessionTypeCardPaymentInfo />
      {isLoading ? (
        <Box mx="auto" mt={8}>
          <Loading />
        </Box>
      ) : (
        <VStack w="100%" alignItems="flex-start" gap={4}>
          <Text fontWeight={500}>
            You have{' '}
            <Text as="span" color="primary.500">
              {availableSessions}/{meetingSessions?.length ?? 0} session
              {availableSessions !== 1 ? 's' : ''}
            </Text>{' '}
            remaining for this plan
          </Text>
        </VStack>
      )}
      <SchedulerPicker />
    </VStack>
  )
}

export default BookingComponent

import { Box, Text, VStack } from '@chakra-ui/react'
import React, { useContext, useEffect, useMemo } from 'react'

import Loading from '@/components/Loading'
import { PublicScheduleContext } from '@/components/public-meeting'
import ProgressHeader from '@/components/public-meeting/ProgressHeader'
import SchedulerPicker from '@/components/public-meeting/SchedulerPicker'
import SessionTypeCardPaymentInfo from '@/components/public-meeting/SessionTypeCardPaymentInfo'
import { MeetingSession, Transaction } from '@/types/Transactions'
import { getTransactionByTxHash } from '@/utils/api_helper'

const BookingComponent = () => {
  const { tx } = useContext(PublicScheduleContext)
  const [isLoading, setIsLoading] = React.useState(true)
  const [meetingSessions, setMeetingSessions] = React.useState<
    MeetingSession[] | null
  >(null)
  const getTransaction = async () => {
    if (!tx) return
    setIsLoading(true)
    const meeting_sessions = await getTransactionByTxHash(tx)
    setMeetingSessions(meeting_sessions)
    setIsLoading(false)
  }
  useEffect(() => {
    if (tx) {
      void getTransaction()
    }
  }, [])
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
          <SchedulerPicker />
        </VStack>
      )}
    </VStack>
  )
}

export default BookingComponent

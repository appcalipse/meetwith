import { Heading, HStack, VStack } from '@chakra-ui/react'
import { PublicScheduleContext } from '@components/public-meeting/index'
import { useQuery } from '@tanstack/react-query'
import React, { FC, useContext, useEffect } from 'react'

import useAccountContext from '@/hooks/useAccountContext'
import { getPaidSessions } from '@/utils/api_helper'

import Loading from '../Loading'
import PaidMeetingsCard from './PaidMeetingsCard'
interface IProps {
  setPaidSessionsExists: (exists: boolean) => void
}
const PaidMeetings: FC<IProps> = ({ setPaidSessionsExists }) => {
  const currentAccount = useAccountContext()
  const { account } = useContext(PublicScheduleContext)
  const { data: paidSessions, isLoading } = useQuery({
    queryKey: ['paidMeetings', account?.address, currentAccount?.address],
    queryFn: () => getPaidSessions(account?.address),
  })
  useEffect(() => {
    if (paidSessions && paidSessions.length > 0) {
      setPaidSessionsExists(true)
    } else {
      setPaidSessionsExists(false)
    }
  }, [paidSessions])
  return isLoading ? (
    <Loading />
  ) : paidSessions && paidSessions.length > 0 ? (
    <VStack rounded={'lg'} gap={4} alignItems="flex-start" w={'100%'} mb={4}>
      <Heading fontSize={{ base: 'lg', md: 'xl', lg: '2xl' }}>
        Paid Sessions
      </Heading>
      <HStack
        w={'100%'}
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        rowGap={{ base: 4, md: '1vw' }}
      >
        {paidSessions?.map(session => (
          <PaidMeetingsCard key={session.id} {...session} />
        ))}
      </HStack>
    </VStack>
  ) : null
}

export default PaidMeetings

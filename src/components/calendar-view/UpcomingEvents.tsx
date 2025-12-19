import { Button } from '@chakra-ui/button'
import { Box, Heading, VStack } from '@chakra-ui/layout'
import * as reactQuery from '@tanstack/react-query'
import { DateTime } from 'luxon'
import * as React from 'react'

import useAccountContext from '@/hooks/useAccountContext'
import { MeetingDecrypted } from '@/types/Meeting'
import { getMeetings } from '@/utils/api_helper'
import { decodeMeeting } from '@/utils/calendar_manager'

import Loading from '../Loading'
import UpComingEvent from './UpcomingEvent'

const UpComingEvents: React.FC = () => {
  const currentAccount = useAccountContext()
  const timezone =
    currentAccount?.preferences.timezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone
  const { data, isLoading } = reactQuery.useQuery<Array<MeetingDecrypted>>({
    queryKey: [
      'upcoming-meetings',
      currentAccount?.address,
      DateTime.now().setZone(timezone).toISODate(),
    ],
    enabled: !!currentAccount?.address,
    queryFn: () =>
      getMeetings(
        currentAccount?.address || '',
        DateTime.now().setZone(timezone).toJSDate(),
        DateTime.now().setZone(timezone).endOf('day').toJSDate(),
        3
      )
        .then(async res => {
          return Promise.all(
            res.map(async meeting => {
              try {
                const decodedMeeting = await decodeMeeting(
                  meeting,
                  currentAccount!
                )
                return decodedMeeting
              } catch (e) {
                return null
              }
            })
          )
        })
        .then(meetings =>
          meetings.filter(
            (meeting): meeting is MeetingDecrypted => meeting !== null
          )
        ),
  })
  return isLoading ? (
    <Box w="100%" display="flex" justifyContent="center" mt={5}>
      <Loading />
    </Box>
  ) : (
    data && data.length > 0 && (
      <VStack mt={5} alignItems="flex-start" w="100%" gap={2.5}>
        <Heading fontSize={20}>Upcoming Events</Heading>
        <>
          {data.map(meeting => (
            <UpComingEvent key={meeting.id} meeting={meeting} />
          ))}
          <Button variant="outline" colorScheme="primary" mt={2} mx="auto">
            View All Meetings
          </Button>
        </>
      </VStack>
    )
  )
}

export default UpComingEvents

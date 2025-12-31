import { Button } from '@chakra-ui/button'
import { Heading, VStack } from '@chakra-ui/layout'
import type { FC } from 'react'

import { MeetingDecrypted } from '@/types/Meeting'

import UpComingEvent from './UpcomingEvent'

interface DesktopUpcomingEventsProps {
  data?: Array<MeetingDecrypted>
}

const DesktopUpcomingEvents: FC<DesktopUpcomingEventsProps> = ({ data }) => {
  return (
    data &&
    data.length > 0 && (
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

export default DesktopUpcomingEvents

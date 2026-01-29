import { Button } from '@chakra-ui/button'
import { Heading, VStack } from '@chakra-ui/layout'
import type { FC } from 'react'
import { DashboardEvent } from '@/types/Calendar'
import UpComingEvent from './UpcomingEvent'

interface DesktopUpcomingEventsProps {
  data?: Array<DashboardEvent>
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
          <Button w="100%" variant="outline" colorScheme="primary" my={2}>
            View All Meetings
          </Button>
        </>
      </VStack>
    )
  )
}

export default DesktopUpcomingEvents

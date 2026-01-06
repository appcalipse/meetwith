import {
  Accordion,
  AccordionButton,
  AccordionItem,
  AccordionPanel,
  Button,
  Heading,
  HStack,
  VStack,
} from '@chakra-ui/react'
import type { FC } from 'react'
import { FaChevronDown, FaChevronRight } from 'react-icons/fa6'

import { MeetingDecrypted } from '@/types/Meeting'

import UpComingEvent from './UpcomingEvent'

interface MobileUpcomingEventsProps {
  data?: Array<MeetingDecrypted>
}

const MobileUpcomingEvents: FC<MobileUpcomingEventsProps> = ({ data }) => {
  return (
    <Accordion allowToggle width="100%">
      <AccordionItem
        width="100%"
        borderColor="connected-calendar-border"
        borderWidth={1}
        borderRadius="0.375rem"
        py={1.5}
        px={3}
      >
        {({ isExpanded }) => (
          <>
            <AccordionButton
              color="upcoming-event-title"
              cursor="pointer"
              width="100%"
              p={0}
            >
              <HStack justifyContent="space-between" w="full">
                <Heading fontSize={isExpanded ? 20 : 16}>
                  Upcoming meetings
                </Heading>
                {isExpanded ? (
                  <FaChevronDown size={15} />
                ) : (
                  <FaChevronRight size={15} />
                )}
              </HStack>
            </AccordionButton>
            <AccordionPanel pb={4} pt={2.5} px={0} w="100%">
              {data && data.length > 0 ? (
                <VStack mt={5} alignItems="flex-start" w="100%" gap={2.5}>
                  {data.map(meeting => (
                    <UpComingEvent key={meeting.id} meeting={meeting} />
                  ))}
                  <Button
                    variant="outline"
                    colorScheme="primary"
                    mt={2}
                    mx="auto"
                  >
                    View All Meetings
                  </Button>
                </VStack>
              ) : (
                <Heading
                  fontSize={14}
                  textAlign="center"
                  color="text-secondary"
                >
                  No upcoming meetings
                </Heading>
              )}
            </AccordionPanel>
          </>
        )}
      </AccordionItem>
    </Accordion>
  )
}

export default MobileUpcomingEvents

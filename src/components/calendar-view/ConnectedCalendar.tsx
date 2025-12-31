import {
  Accordion,
  AccordionButton,
  AccordionItem,
  AccordionPanel,
  Heading,
  HStack,
} from '@chakra-ui/react'
import * as React from 'react'
import { FaChevronDown, FaChevronRight } from 'react-icons/fa6'

import { useCalendarContext } from '@/providers/calendar/CalendarContext'

import ConnectedCalendarItem from './ConnectedCalendarItem'

const ConnectedCalendar: React.FC = () => {
  const { calendars } = useCalendarContext()

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
                <Heading fontSize={16}>Connected Calendars</Heading>
                {isExpanded ? (
                  <FaChevronDown size={15} />
                ) : (
                  <FaChevronRight size={15} />
                )}
              </HStack>
            </AccordionButton>
            <AccordionPanel pb={4} pt={2.5} px={0} w="100%">
              <Accordion allowMultiple w="100%">
                {calendars?.map(calendar => (
                  <ConnectedCalendarItem
                    key={calendar.id}
                    calendar={calendar}
                  />
                ))}
              </Accordion>
            </AccordionPanel>
          </>
        )}
      </AccordionItem>
    </Accordion>
  )
}

export default ConnectedCalendar

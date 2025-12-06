import {
  Accordion,
  AccordionButton,
  AccordionItem,
  AccordionPanel,
  Heading,
  HStack,
} from '@chakra-ui/react'
import * as React from 'react'
import { FaChevronDown, FaChevronUp } from 'react-icons/fa6'

import { useCalendarContext } from '@/providers/calendar/CalendarContext'

import ConnectedCalendarItem from './ConnectedCalendarItem'

const ConnectedCalendar: React.FC = () => {
  const { calendars } = useCalendarContext()

  return (
    <Accordion allowToggle width="100%">
      <AccordionItem
        width="100%"
        borderColor="text-subtle"
        borderWidth={1}
        borderRadius="0.375rem"
        py={1.5}
        px={3}
      >
        {({ isExpanded }) => (
          <>
            <AccordionButton color="white" cursor="pointer" width="100%" p={0}>
              <HStack justifyContent="space-between" w="full">
                <Heading fontSize={16}>Connected Calendars</Heading>
                {isExpanded ? (
                  <FaChevronUp size={15} />
                ) : (
                  <FaChevronDown size={15} />
                )}
              </HStack>
            </AccordionButton>
            <AccordionPanel pb={4}>
              <Accordion allowMultiple allowToggle>
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

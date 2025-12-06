import {
  AccordionButton,
  AccordionItem,
  AccordionPanel,
  Checkbox,
  HStack,
  Text,
} from '@chakra-ui/react'
import * as React from 'react'
import { FaChevronDown, FaChevronUp } from 'react-icons/fa6'

import { ConnectedCalendarCore } from '@/types/CalendarConnections'

interface ConnectedCalendarItemProps {
  calendar: ConnectedCalendarCore
}

const ConnectedCalendarItem: React.FC<ConnectedCalendarItemProps> = ({
  calendar,
}) => {
  return (
    <AccordionItem>
      {({ isExpanded }) => (
        <>
          <AccordionButton color="white">
            <HStack justifyContent="space-between" w="full">
              <Text>{calendar.email}</Text>
              {isExpanded ? (
                <FaChevronUp size={15} />
              ) : (
                <FaChevronDown size={15} />
              )}
            </HStack>
          </AccordionButton>
          <AccordionPanel pb={4}>
            {calendar.calendars.map(cal => (
              <HStack key={`${cal.calendarId}-${calendar.id}`}>
                <Checkbox />
                <Text fontSize="14" mb={2}>
                  {cal.name}
                </Text>
              </HStack>
            ))}
          </AccordionPanel>
        </>
      )}
    </AccordionItem>
  )
}

export default ConnectedCalendarItem

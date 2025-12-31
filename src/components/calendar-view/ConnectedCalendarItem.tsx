import {
  AccordionButton,
  AccordionItem,
  AccordionPanel,
  Checkbox,
  HStack,
  Text,
  VStack,
} from '@chakra-ui/react'
import * as React from 'react'
import { FaChevronDown, FaChevronRight } from 'react-icons/fa6'

import { useCalendarContext } from '@/providers/calendar/CalendarContext'
import {
  CalendarSyncInfo,
  ConnectedCalendarCore,
} from '@/types/CalendarConnections'

interface ConnectedCalendarItemProps {
  calendar: ConnectedCalendarCore
}

const ConnectedCalendarItem: React.FC<ConnectedCalendarItemProps> = ({
  calendar,
}) => {
  const { selectedCalendars, setSelectedCalendars } = useCalendarContext()
  const handleToggleCalendar = (
    e: React.ChangeEvent<HTMLInputElement>,
    cal: CalendarSyncInfo
  ) => {
    if (e.target.checked) {
      setSelectedCalendars([...selectedCalendars, cal])
    } else {
      setSelectedCalendars(
        selectedCalendars.filter(
          selCal =>
            !(selCal.calendarId === cal.calendarId && selCal.name === cal.name)
        )
      )
    }
  }
  return (
    <AccordionItem p={0} m={0} width="100%" border="none">
      {({ isExpanded }) => (
        <>
          <AccordionButton color="upcoming-event-title" p={0} w="100%">
            <HStack justifyContent="space-between" w="100%">
              <HStack gap={1}>
                <Text fontWeight={700}>{calendar.email}</Text>
              </HStack>
              {isExpanded ? (
                <FaChevronDown size={15} />
              ) : (
                <FaChevronRight size={15} />
              )}
            </HStack>
          </AccordionButton>
          <AccordionPanel pb={4} px={0}>
            <VStack gap={3} align="flex-start">
              {calendar.calendars.map(cal => (
                <HStack
                  key={`${cal.calendarId}-${calendar.id}`}
                  alignItems="center"
                  gap={1}
                >
                  <Checkbox
                    width={6}
                    height={6}
                    id={`${cal.calendarId}-${calendar.id}`}
                    borderColor={cal.color || 'primary.500'}
                    sx={{
                      '& .chakra-checkbox__control': {
                        _checked: {
                          bg: `${cal.color || 'primary.500'} !important`,
                          borderColor: `${
                            cal.color || 'primary.500'
                          } !important`,
                        },
                      },
                    }}
                    isChecked={selectedCalendars.some(
                      selCal =>
                        selCal.calendarId === cal.calendarId &&
                        selCal.name === cal.name
                    )}
                    onChange={e => handleToggleCalendar(e, cal)}
                  />
                  <label htmlFor={`${cal.calendarId}-${calendar.id}`}>
                    <Text fontSize="14">{cal.name}</Text>
                  </label>
                </HStack>
              ))}
            </VStack>
          </AccordionPanel>
        </>
      )}
    </AccordionItem>
  )
}

export default ConnectedCalendarItem

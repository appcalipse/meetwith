import {
  Box,
  Checkbox,
  Flex,
  HStack,
  Spinner,
  Switch,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import React from 'react'

import { CalendarSyncInfo } from '@/types/CalendarConnections'

export interface MultipleCalendarListProps {
  calendars: (CalendarSyncInfo & { loading: boolean })[]
  updateCalendars: (
    calendars: (CalendarSyncInfo & { loading: boolean })[],
    index: number
  ) => void
}

const MultipleCalendarList: React.FC<MultipleCalendarListProps> = props => {
  const borderColor = useColorModeValue('gray.200', 'gray.900')
  const loaderColor = useColorModeValue(
    'rgba(255,255,255,0.5)',
    'rgba(0,0,0,0.1)'
  )

  const toggleCalendar = (calendar: CalendarSyncInfo) => {
    const index = props.calendars
      .map(c => c.calendarId)
      .indexOf(calendar.calendarId)
    const calendars = JSON.parse(
      JSON.stringify(
        props.calendars.filter(c => c.calendarId !== calendar.calendarId)
      )
    )
    calendars.splice(index, 0, { ...calendar, enabled: !calendar.enabled })
    props.updateCalendars(calendars, index)
  }

  const toggleAddMeetingsToCalendar = (calendar: CalendarSyncInfo) => {
    const index = props.calendars
      .map(c => c.calendarId)
      .indexOf(calendar.calendarId)
    const calendars = JSON.parse(
      JSON.stringify(
        props.calendars.filter(c => c.calendarId !== calendar.calendarId)
      )
    )
    calendars.splice(index, 0, { ...calendar, sync: !calendar.sync })
    props.updateCalendars(calendars, index)
  }

  const enableWebhooksForCalendar = (calendar: CalendarSyncInfo) => {
    const index = props.calendars
      .map(c => c.calendarId)
      .indexOf(calendar.calendarId)
    const calendars = JSON.parse(
      JSON.stringify(
        props.calendars.filter(c => c.calendarId !== calendar.calendarId)
      )
    )
    calendars.splice(index, 0, { ...calendar, webhook: !calendar.webhook })
    props.updateCalendars(calendars, index)
  }

  return (
    <Box pl={{ base: 0, md: 20 }}>
      <VStack width="100%" flexWrap="wrap" alignItems="flex-start">
        <HStack width="100%">
          <Text fontWeight={'bold'}>Available calendars</Text>
        </HStack>
        {props.calendars.map((calendar, index) => (
          <Flex
            key={index}
            flexDirection={{ base: 'column', md: 'row' }}
            borderBottom={
              index !== props.calendars.length - 1 ? '1px solid' : ''
            }
            borderBottomColor={borderColor}
            py={3}
            mt={[0, '0rem !important']}
            width="100%"
            position="relative"
          >
            <Checkbox
              flex={1}
              colorScheme="primary"
              isChecked={calendar.enabled}
              onChange={e => toggleCalendar(calendar)}
              mb={{ base: 4, md: 0 }}
            >
              <HStack>
                <Text flex={1} whiteSpace="nowrap">
                  {calendar.name}
                </Text>
                <Box
                  w="20px"
                  height="20px"
                  border="1px solid gray"
                  borderRadius="4px"
                  bgColor={calendar.color || 'white'}
                />
              </HStack>
            </Checkbox>

            <VStack>
              <Flex
                justifyContent={{ base: 'flex-end', md: 'flex-start' }}
                alignItems="center"
                direction={{ base: 'row-reverse', md: 'row' }}
                pl={{ base: 0, md: 4 }}
              >
                <Text
                  fontSize="sm"
                  mr={{ base: 0, md: 4 }}
                  align={{ base: 'left', md: 'end' }}
                >
                  Add new Meetwith meetings to this calendar
                </Text>
                <Switch
                  size="md"
                  colorScheme="primary"
                  mr="4"
                  isChecked={calendar.enabled && calendar.sync}
                  onChange={() => toggleAddMeetingsToCalendar(calendar)}
                  isDisabled={!calendar.enabled || calendar.loading}
                />
              </Flex>
              <Flex
                justifyContent={{ base: 'flex-end', md: 'flex-start' }}
                alignItems="center"
                direction={{ base: 'row-reverse', md: 'row' }}
                pl={{ base: 0, md: 4 }}
              >
                <Text
                  fontSize="sm"
                  mr={{ base: 0, md: 4 }}
                  align={{ base: 'left', md: 'end' }}
                >
                  Enable webhook events for this calendar
                </Text>
                <Switch
                  size="md"
                  colorScheme="primary"
                  mr="4"
                  isChecked={calendar.enabled && calendar.webhook}
                  onChange={() => enableWebhooksForCalendar(calendar)}
                  isDisabled={!calendar.enabled || calendar.loading}
                />
              </Flex>
            </VStack>

            {!!calendar.loading && (
              <Flex
                position="absolute"
                top={0}
                left={0}
                w="100%"
                h="100%"
                bgColor={loaderColor}
                alignItems="center"
                justifyContent="center"
              >
                <Spinner />
              </Flex>
            )}
          </Flex>
        ))}
      </VStack>
    </Box>
  )
}

export { MultipleCalendarList }

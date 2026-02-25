import {
  Box,
  Checkbox,
  Divider,
  Flex,
  HStack,
  Spinner,
  Switch,
  Tag,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import React from 'react'

import { CalendarSyncInfo } from '@/types/CalendarConnections'
import InfoTooltip from '../profile/components/Tooltip'

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

  const writableCalendars = props.calendars.filter(c => !c.isReadOnly)
  const readOnlyCalendars = props.calendars.filter(c => c.isReadOnly)

  const renderCalendarRow = (
    calendar: CalendarSyncInfo & { loading: boolean },
    index: number,
    totalInSection: number,
    showSyncControl: boolean
  ) => (
    <Flex
      key={calendar.calendarId}
      flexDirection={{ base: 'column', md: 'row' }}
      borderBottom={index !== totalInSection - 1 ? '1px solid' : ''}
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
        onChange={() => toggleCalendar(calendar)}
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

      {showSyncControl && (
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
      )}

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
  )

  return (
    <Box pl={{ base: 0, md: 20 }}>
      <VStack width="100%" flexWrap="wrap" alignItems="flex-start">
        <HStack width="100%">
          <Text fontWeight="bold">Available calendars</Text>
        </HStack>

        {writableCalendars.map((calendar, index) =>
          renderCalendarRow(calendar, index, writableCalendars.length, true)
        )}

        {readOnlyCalendars.length > 0 && (
          <>
            <HStack width="100%" gap={0} mt={4} mb={1} alignItems="center">
              <Divider flex={1} borderColor="border-subtle" />
              <Tag
                size="sm"
                bg="border-subtle"
                whiteSpace="nowrap"
                color="text-base"
                px={3}
                py={1.5}
                alignItems="center"
                rounded="full"
              >
                Read-only
                <InfoTooltip text="Used for availability checks only" mb={0} />
              </Tag>
              <Divider flex={1} borderColor="border-subtle" />
            </HStack>

            {readOnlyCalendars.map((calendar, index) =>
              renderCalendarRow(
                calendar,
                index,
                readOnlyCalendars.length,
                false
              )
            )}
          </>
        )}
      </VStack>
    </Box>
  )
}

export { MultipleCalendarList }

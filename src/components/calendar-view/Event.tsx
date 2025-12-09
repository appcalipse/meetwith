import { GridItem, Text, VStack } from '@chakra-ui/layout'
import {
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverTrigger,
} from '@chakra-ui/react'
import { DateTime } from 'luxon'
import * as React from 'react'

import { WithInterval } from '@/providers/calendar/CalendarContext'
import { UnifiedEvent } from '@/types/Calendar'
import { MeetingDecrypted } from '@/types/Meeting'
import {
  generateBorderColor,
  getDesignSystemTextColor,
} from '@/utils/color-utils'

import EventDetailsPopOver from './EventDetailsPopOver'

interface EventProps {
  slot: WithInterval<UnifiedEvent<DateTime> | MeetingDecrypted<DateTime>>
  bg: string
  allSlotsForDay: Array<
    WithInterval<UnifiedEvent<DateTime> | MeetingDecrypted<DateTime>>
  >
  timeSlot: DateTime
}

const Event: React.FC<EventProps> = ({
  slot,
  bg,
  allSlotsForDay,
  timeSlot,
}) => {
  const duration = slot.interval.toDuration('minutes').toObject().minutes || 0
  const height = (duration / 60) * 36
  const top =
    ((slot.start.diff(timeSlot, 'minutes').toObject().minutes || 0) / 60) * 36
  const isStartInsideOtherEvent = React.useMemo(() => {
    return allSlotsForDay.filter(otherEvent => {
      if (otherEvent.id === slot.id) return false
      return slot.start > otherEvent.start && slot.start < otherEvent.end
    })
  }, [allSlotsForDay, slot])
  const margin = isStartInsideOtherEvent.length * 3
  return (
    <Popover>
      <PopoverTrigger>
        <GridItem
          bg={bg}
          borderWidth={1}
          borderLeftWidth={5}
          rounded={'3px'}
          px={1.5}
          borderColor={generateBorderColor(bg)}
          color={getDesignSystemTextColor(bg)}
          w="100%"
          minW={0}
          height={height}
          marginTop={margin}
          marginLeft={margin}
          top={top}
          zIndex={2}
          py={0}
          overflowY="hidden"
          _hover={{
            borderWidth: '2px',
            borderLeftWidth: 5,
          }}
        >
          <VStack gap={0}>
            <Text
              w="100%"
              whiteSpace="nowrap"
              overflow="hidden"
              textOverflow="ellipsis"
              fontSize="xs"
            >
              {slot.title}
            </Text>
            <Text fontSize="10px">{slot.interval.toFormat('t')}</Text>
          </VStack>
        </GridItem>
      </PopoverTrigger>
      <PopoverContent zIndex={10} width="400px">
        <PopoverArrow />
        <PopoverCloseButton />

        <PopoverBody>
          <EventDetailsPopOver slot={slot} />
        </PopoverBody>
      </PopoverContent>
    </Popover>
  )
}

export default Event

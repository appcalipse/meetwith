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
import { FaExpand } from 'react-icons/fa6'

import useAccountContext from '@/hooks/useAccountContext'
import { useCalendarContext } from '@/providers/calendar/CalendarContext'
import {
  AttendeeStatus,
  isCalendarEvent,
  UnifiedEvent,
  WithInterval,
} from '@/types/Calendar'
import { MeetingDecrypted } from '@/types/Meeting'
import { ParticipationStatus } from '@/types/ParticipantInfo'
import {
  generateBorderColor,
  getDesignSystemTextColor,
} from '@/utils/color-utils'

import EventDetailsPopOver from './EventDetailsPopOver'

interface EventProps {
  event: WithInterval<UnifiedEvent<DateTime> | MeetingDecrypted<DateTime>>
  bg: string
  dayEvents: Array<
    WithInterval<UnifiedEvent<DateTime> | MeetingDecrypted<DateTime>>
  >
  timeSlot: DateTime
  onClick?: () => void
}

const Event: React.FC<EventProps> = ({ bg, dayEvents, event, timeSlot }) => {
  const currentAccount = useAccountContext()
  const { setSelectedSlot } = useCalendarContext()
  const actor = React.useMemo(() => {
    if (isCalendarEvent(event)) {
      return event.attendees?.find(
        attendee => attendee.email === event.accountEmail
      )
    } else {
      return event.participants.find(
        participant => participant.account_address === currentAccount?.address
      )
    }
  }, [event, currentAccount])
  const isDeclined =
    actor?.status &&
    [ParticipationStatus.Rejected, AttendeeStatus.DECLINED].includes(
      actor?.status
    )
  const isPendingAction =
    actor?.status &&
    [
      ParticipationStatus.Pending,
      AttendeeStatus.TENTATIVE,
      AttendeeStatus.NEEDS_ACTION,
      AttendeeStatus.DELEGATED,
    ].includes(actor?.status)
  const isAccepted =
    actor?.status &&
    [
      ParticipationStatus.Accepted,
      AttendeeStatus.ACCEPTED,
      AttendeeStatus.COMPLETED,
    ].includes(actor?.status)

  const isStartInsideOtherEvent = dayEvents.filter(otherEvent => {
    if (otherEvent.id === event.id) return false
    return event.start > otherEvent.start && event.start < otherEvent.end
  })
  const duration = event.interval.toDuration('minutes').toObject().minutes || 0
  const height = (duration / 60) * 36
  const margin = isStartInsideOtherEvent.length * 3
  const top =
    ((event.start.diff(timeSlot, 'minutes').toObject().minutes || 0) / 60) * 36
  return (
    <Popover isLazy placement="auto">
      {({ onClose }) => (
        <>
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
              height={`${Math.max(height, 18)}px`}
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
                  {event.title}
                </Text>
                <Text fontSize="10px">{event.interval.toFormat('t')}</Text>
              </VStack>
            </GridItem>
          </PopoverTrigger>
          <PopoverContent zIndex={10} width="600px">
            <PopoverArrow />
            <PopoverCloseButton
              onClick={() => {
                onClose()
                setSelectedSlot(event)
              }}
              as={FaExpand}
              size={'24'}
              top={4}
              right={4}
            />

            <PopoverBody>
              <EventDetailsPopOver slot={event} />
            </PopoverBody>
          </PopoverContent>
        </>
      )}
    </Popover>
  )
}

export default Event

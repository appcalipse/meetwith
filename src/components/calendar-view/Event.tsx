import { GridItem, Text, VStack } from '@chakra-ui/layout'
import {
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverTrigger,
  useDisclosure,
} from '@chakra-ui/react'
import { DateTime } from 'luxon'
import * as React from 'react'
import { FaExpand, FaX } from 'react-icons/fa6'

import useAccountContext from '@/hooks/useAccountContext'
import {
  createEventsQueryKey,
  useCalendarContext,
} from '@/providers/calendar/CalendarContext'
import {
  isAccepted,
  isCalendarEvent,
  isDeclined,
  isPendingAction,
  UnifiedEvent,
  WithInterval,
} from '@/types/Calendar'
import { MeetingDecrypted } from '@/types/Meeting'
import {
  generateBorderColor,
  getDesignSystemTextColor,
} from '@/utils/color-utils'
import { queryClient } from '@/utils/react_query'

import { CancelMeetingDialog } from '../schedule/cancel-dialog'
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
  const { setSelectedSlot, currrentDate } = useCalendarContext()
  const {
    isOpen: isCancelOpen,
    onOpen: onCancelOpen,
    onClose: onCancelClose,
  } = useDisclosure()
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
  const isDeclinedStatus = isDeclined(actor?.status)
  const isPendingStatus = isPendingAction(actor?.status)
  const isAcceptedStatus = isAccepted(actor?.status)

  const isStartInsideOtherEvent = dayEvents.filter(otherEvent => {
    if (otherEvent.id === event.id) return false
    return event.start > otherEvent.start && event.start < otherEvent.end
  })
  const duration = event.interval.toDuration('minutes').toObject().minutes || 0
  const height = (duration / 60) * 36
  const margin = isStartInsideOtherEvent.length * 3
  const top =
    ((event.start.diff(timeSlot, 'minutes').toObject().minutes || 0) / 60) * 36
  const handleSelectEvent = (close: () => void) => {
    close()
    if (!isCalendarEvent(event)) {
      setSelectedSlot({
        ...event,
        start: event.start.toJSDate(),
        end: event.end.toJSDate(),
      })
    }
  }
  const handleCleanup = async (close: () => void) => {
    await Promise.all([
      queryClient.invalidateQueries(createEventsQueryKey(currrentDate)),
      queryClient.invalidateQueries(
        createEventsQueryKey(currrentDate.minus({ month: 1 }))
      ),
      queryClient.invalidateQueries(
        createEventsQueryKey(currrentDate.plus({ month: 1 }))
      ),
    ])
    close()
  }
  return (
    <Popover isLazy placement="auto">
      {({ onClose }) => (
        <>
          {isCancelOpen && !isCalendarEvent(event) && (
            <CancelMeetingDialog
              isOpen
              onClose={onCancelClose}
              decryptedMeeting={event}
              currentAccount={currentAccount}
              afterCancel={() => handleCleanup(onClose)}
            />
          )}
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
              onClick={() => handleSelectEvent(onClose)}
              as={isCalendarEvent(event) ? FaX : FaExpand}
              size={'24'}
              top={4}
              right={4}
            />

            <PopoverBody>
              <EventDetailsPopOver
                slot={event}
                onSelectEvent={() => handleSelectEvent(onClose)}
                onClose={onClose}
                onCancelOpen={onCancelOpen}
              />
            </PopoverBody>
          </PopoverContent>
        </>
      )}
    </Popover>
  )
}

export default Event

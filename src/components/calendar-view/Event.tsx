import { GridItem, Text, VStack } from '@chakra-ui/layout'
import {
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverTrigger,
  useColorMode,
  useDisclosure,
} from '@chakra-ui/react'
import { colord } from 'colord'
import { DateTime } from 'luxon'
import * as React from 'react'
import { FaExpand } from 'react-icons/fa6'

import useAccountContext from '@/hooks/useAccountContext'
import {
  CalendarEventsData,
  useCalendarContext,
} from '@/providers/calendar/CalendarContext'
import {
  isCalendarEvent,
  isDeclined,
  isPendingAction,
  UnifiedAttendee,
  UnifiedEvent,
  WithInterval,
} from '@/types/Calendar'
import { MeetingDecrypted } from '@/types/Meeting'
import { ParticipantInfo } from '@/types/ParticipantInfo'
import { getActor } from '@/utils/calendar_manager'
import {
  generateBorderColor,
  getDesignSystemTextColor,
} from '@/utils/color-utils'
import QueryKeys from '@/utils/query_keys'
import { queryClient } from '@/utils/react_query'
import { CancelMeetingDialog } from '../schedule/cancel-dialog'
import { DeleteEventDialog } from '../schedule/delete-event-dialog'
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
  const { setSelectedSlot, currentDate } = useCalendarContext()
  const {
    isOpen: isCancelOpen,
    onOpen: onCancelOpen,
    onClose: onCancelClose,
  } = useDisclosure()
  const {
    isOpen: isDeleteEventOpen,
    onOpen: onDeleteEventOpen,
    onClose: onDeleteEventClose,
  } = useDisclosure()
  const [actor, setActor] = React.useState<
    UnifiedAttendee | ParticipantInfo | undefined
  >(getActor(event, currentAccount!))

  const isDeclinedStatus = isDeclined(actor?.status)
  const handleOpenDeleteDialog = () => {
    if (isCalendarEvent(event)) {
      onDeleteEventOpen()
    } else {
      onCancelOpen()
    }
  }
  const isPendingStatus = isPendingAction(actor?.status)

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
    setSelectedSlot(event)
    close()
  }
  const { colorMode } = useColorMode()
  const borderColor = React.useMemo(
    () => generateBorderColor(bg, colorMode === 'light'),
    [bg, colorMode]
  )
  const stripeColor = React.useMemo(
    () => colord(borderColor).alpha(0.35).toRgbString(),
    [borderColor]
  )
  const handleCleanup = async (close: () => void) => {
    const isCalEvent = isCalendarEvent(event)

    queryClient.setQueriesData<CalendarEventsData>(
      { queryKey: [QueryKeys.calendarEvents()] },
      old => {
        if (!old) return old

        return {
          calendarEvents: isCalEvent
            ? old.calendarEvents?.filter(
                e => e.sourceEventId !== event.sourceEventId
              ) ?? []
            : old.calendarEvents ?? [],
          mwwEvents: !isCalEvent
            ? old.mwwEvents?.filter(e => e.id !== event.id) ?? []
            : old.mwwEvents ?? [],
        }
      }
    )
    close()

    queryClient.invalidateQueries({ queryKey: [QueryKeys.calendarEvents()] })
  }

  return (
    <Popover isLazy placement="auto" strategy="fixed" gutter={12}>
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
          {isDeleteEventOpen && isCalendarEvent(event) && (
            <DeleteEventDialog
              isOpen={isDeleteEventOpen}
              onClose={onDeleteEventClose}
              event={{
                ...event,
                start: event.start.toJSDate(),
                end: event.end.toJSDate(),
              }}
              afterCancel={() => handleCleanup(onDeleteEventClose)}
            />
          )}
          <PopoverTrigger>
            <GridItem
              bg={bg}
              borderWidth={1}
              borderLeftWidth={5}
              rounded={'3px'}
              px={1.5}
              borderColor={borderColor}
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
              position="relative"
              _after={
                isPendingStatus
                  ? {
                      content: '""',
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '3px',
                      pointerEvents: 'none',
                      backgroundImage: `repeating-linear-gradient(135deg, ${stripeColor} 0 6px, rgba(0,0,0,0) 6px 12px)`,
                    }
                  : undefined
              }
            >
              <VStack gap={0} align="flex-start" w="100%" minW={0}>
                <Text
                  w="100%"
                  whiteSpace="nowrap"
                  overflow="hidden"
                  textOverflow="ellipsis"
                  fontSize="xs"
                  textDecoration={isDeclinedStatus ? 'line-through' : undefined}
                >
                  {event.title}
                </Text>
                {height >= 36 && (
                  <Text
                    fontSize="10px"
                    w="100%"
                    whiteSpace="nowrap"
                    overflow="hidden"
                    textOverflow="ellipsis"
                  >
                    {event.interval.toFormat('t')}
                  </Text>
                )}
              </VStack>
            </GridItem>
          </PopoverTrigger>
          <PopoverContent zIndex={1500} width={{ base: '80vw', md: '600px' }}>
            <PopoverArrow />
            <PopoverCloseButton
              onClick={() => handleSelectEvent(onClose)}
              as={FaExpand}
              size={'24'}
              top={4}
              right={4}
            />

            <PopoverBody>
              <EventDetailsPopOver
                slot={event}
                onSelectEvent={() => handleSelectEvent(onClose)}
                onClose={onClose}
                onCancelOpen={handleOpenDeleteDialog}
                actor={actor}
                setActor={setActor}
              />
            </PopoverBody>
          </PopoverContent>
        </>
      )}
    </Popover>
  )
}

export default Event

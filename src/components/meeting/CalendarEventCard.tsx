import {
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  Heading,
  HStack,
  IconButton,
  Link,
  Tag,
  TagLabel,
  Text,
  Tooltip,
  useColorModeValue,
  useDisclosure,
  VStack,
} from '@chakra-ui/react'
import { DateTime } from 'luxon'
import { FC, useEffect, useMemo, useRef, useState } from 'react'
import { FaRegCopy, FaTrash } from 'react-icons/fa6'
import { Frequency } from 'rrule'
import sanitizeHtml from 'sanitize-html'

import useClipboard from '@/hooks/useClipboard'
import {
  AttendeeStatus,
  CalendarEvents,
  isAccepted,
  isDeclined,
  isPendingAction,
  UnifiedAttendee,
  UnifiedEvent,
} from '@/types/Calendar'
import { logEvent } from '@/utils/analytics'
import { updateCalendarRsvpStatus } from '@/utils/api_helper'
import { dateToLocalizedRange } from '@/utils/calendar_manager'
import { addUTMParams } from '@/utils/huddle.helper'
import { queryClient } from '@/utils/react_query'
import { useToastHelpers } from '@/utils/toasts'
import { rsvpQueue } from '@/utils/workers/rsvp.queue'
import { DeleteEventDialog } from '../schedule/delete-event-dialog'
import { defineLabel } from './MeetingCard'

interface CalendarEventCardProps {
  event: UnifiedEvent
  timezone: string
  removeEventFromCache: (eventId: string) => void
  updateAttendeeStatus: (
    eventId: string,
    accountEmail: string,
    status: AttendeeStatus
  ) => void
}
const getRecurrenceLabel = (freq?: Frequency) => {
  switch (freq) {
    case Frequency.DAILY:
      return 'Daily'
    case Frequency.WEEKLY:
      return 'Weekly'
    case Frequency.MONTHLY:
      return 'Monthly'
    case Frequency.YEARLY:
      return 'Yearly'
    default:
      return null
  }
}
const getActors = (event: UnifiedEvent) =>
  event.attendees?.find(attendee => attendee.email === event.accountEmail)

const CalendarEventCard: FC<CalendarEventCardProps> = ({
  event,
  timezone,
  updateAttendeeStatus,
  removeEventFromCache,
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const label = defineLabel(event.start as Date, event.end as Date, timezone)
  const { copyFeedbackOpen, handleCopy } = useClipboard()
  const rsvpAbortControllerRef = useRef<AbortController | null>(null)
  const { showErrorToast } = useToastHelpers()
  const bgColor = useColorModeValue('white', 'neutral.900')
  const iconColor = useColorModeValue('gray.500', 'gray.200')

  const isRecurring =
    event?.recurrence && Object.values(event?.recurrence).length > 0
  const recurrenceLabel = getRecurrenceLabel(event?.recurrence?.frequency)
  const participants = useMemo(() => {
    const result: string[] = []
    const attendees: UnifiedAttendee[] =
      event?.attendees && event?.attendees.length > 0
        ? event.attendees
        : [
            {
              email: event.accountEmail,
              name: 'You',
              isOrganizer: true,
              providerData: {},
              status: AttendeeStatus.ACCEPTED,
            },
          ]

    for (const attendee of attendees) {
      let display = ''
      if (attendee.email === event.accountEmail) {
        display = 'You'
      } else if (attendee.name) {
        display = attendee.name
      } else if (attendee.email) {
        display = attendee.email
      }
      if (attendee.isOrganizer) {
        display = `${display} (Organizer)`
      }
      result.push(display)
    }
    return result.join(', ')
  }, [event])

  const [actor, setActor] = useState(getActors(event))
  useEffect(() => {
    setActor(getActors(event))
  }, [event])
  const handleRSVP = async (status: AttendeeStatus) => {
    const previousStatus = actor?.status

    if (rsvpAbortControllerRef.current) {
      rsvpAbortControllerRef.current.abort()
    }
    const abortController = new AbortController()
    rsvpAbortControllerRef.current = abortController

    setActor(prev => {
      if (prev) {
        return { ...prev, status }
      }
      return prev
    })

    try {
      await rsvpQueue.enqueue(
        event.calendarId,
        event.sourceEventId,
        status,
        event.accountEmail,
        abortController.signal
      )

      updateAttendeeStatus(event.sourceEventId, event.accountEmail, status)
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        (error.message === 'Aborted' || error.message === 'Superseded')
      ) {
        // Intentionally cancelled, local state already updated by new request
        return
      }

      setActor(prev => {
        if (prev && previousStatus) {
          return { ...prev, status: previousStatus }
        }
        return prev
      })
      showErrorToast(
        'RSVP Update Failed',
        'There was an error updating your RSVP status. Please try again.'
      )
    } finally {
      rsvpAbortControllerRef.current = null
    }
  }
  return (
    <Box
      shadow="sm"
      width="100%"
      borderRadius="lg"
      position="relative"
      bgColor={bgColor}
      mt={3}
      pt={{
        base: 3,
        md: 2,
      }}
    >
      <HStack position="absolute" right={0} top={0}>
        {label && (
          <Badge
            borderRadius={0}
            borderBottomRightRadius={4}
            px={2}
            py={1}
            colorScheme={label.color}
            alignSelf="flex-end"
          >
            {label.text}
          </Badge>
        )}
        {isRecurring && recurrenceLabel && (
          <Badge
            borderRadius={0}
            borderBottomRightRadius={4}
            px={2}
            py={1}
            colorScheme={'gray'}
            alignSelf="flex-end"
          >
            Recurrence: {recurrenceLabel}
          </Badge>
        )}{' '}
        <Badge
          fontSize="xs"
          borderRadius={0}
          borderBottomRightRadius={4}
          px={2}
          py={1}
          colorScheme={'primary'}
        >
          {event.source}
        </Badge>
      </HStack>
      <Box p={6} pt={isRecurring ? 8 : 6} maxWidth="100%">
        <VStack alignItems="start" position="relative" gap={6}>
          <Flex
            alignItems="start"
            w="100%"
            flexDirection={{
              base: 'column-reverse',
              md: 'row',
            }}
            gap={4}
            flexWrap="wrap"
          >
            <VStack flex={1} alignItems="start">
              <Flex flex={1} alignItems="center" gap={3}>
                <Heading fontSize="24px">
                  <strong>{event?.title || 'No Title'}</strong>
                </Heading>
              </Flex>
              <Text fontSize="16px" alignItems="start">
                <strong>
                  {dateToLocalizedRange(
                    event.start as Date,
                    event.end as Date,
                    timezone,
                    true
                  )}
                </strong>
              </Text>
            </VStack>

            <HStack
              ml={{
                base: 'auto',
                md: 0,
              }}
            >
              <Link
                href={addUTMParams(event?.meeting_url || '')}
                isExternal
                onClick={() => logEvent('Joined a meeting')}
                whiteSpace="nowrap"
                overflow="hidden"
                textOverflow="ellipsis"
                maxWidth="100%"
                textDecoration="none"
                flex={1}
                _hover={{
                  textDecoration: 'none',
                }}
              >
                <Button colorScheme="primary">Join meeting</Button>
              </Link>
              <Tooltip label="Delete meeting" placement="top">
                <IconButton
                  color={iconColor}
                  aria-label="delete"
                  icon={<FaTrash size={16} />}
                  onClick={onOpen}
                />
              </Tooltip>
            </HStack>
          </Flex>

          <Divider />
          <VStack alignItems="start" maxWidth="100%">
            <HStack alignItems="flex-start" maxWidth="100%">
              <Text display="inline" width="100%" whiteSpace="balance">
                <strong>Participants: </strong>
                {participants || 'No participants'}
              </Text>
            </HStack>
            <HStack
              alignItems="flex-start"
              maxWidth="100%"
              flexWrap="wrap"
              gap={2}
              width="100%"
            >
              <Text whiteSpace="nowrap" fontWeight={700}>
                Meeting link:
              </Text>
              <Flex flex={1} overflow="hidden">
                <Link
                  whiteSpace="nowrap"
                  textOverflow="ellipsis"
                  overflow="hidden"
                  href={addUTMParams(event.meeting_url || '')}
                  isExternal
                  onClick={() => logEvent('Clicked to start meeting')}
                >
                  {event.meeting_url}
                </Link>
                <Tooltip
                  label="Link copied"
                  placement="top"
                  isOpen={copyFeedbackOpen}
                >
                  <Button
                    w={4}
                    colorScheme="primary"
                    variant="link"
                    onClick={() => handleCopy(event.meeting_url || '')}
                    leftIcon={
                      <FaRegCopy size={16} display="block" cursor="pointer" />
                    }
                  />
                </Tooltip>
              </Flex>
            </HStack>
            {event.description && (
              <HStack alignItems="flex-start" flexWrap="wrap">
                <Text>
                  <strong>Description:</strong>
                </Text>
                <Text
                  width="100%"
                  wordBreak="break-word"
                  whiteSpace="pre-wrap"
                  suppressHydrationWarning
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(event.description.trim(), {
                      allowedAttributes: false,
                      allowVulnerableTags: false,
                    }),
                  }}
                />
              </HStack>
            )}
          </VStack>
          <HStack alignItems="center" gap={3.5}>
            <Text fontWeight={700}>RSVP:</Text>
            <HStack alignItems="center" gap={2}>
              <Tag
                bg={isAccepted(actor?.status) ? 'green.500' : 'transparent'}
                borderWidth={1}
                borderColor={'green.500'}
                rounded="full"
                px={3}
                fontSize={{
                  lg: '16px',
                  md: '14px',
                  base: '12px',
                }}
                onClick={() => handleRSVP(AttendeeStatus.ACCEPTED)}
                cursor="pointer"
              >
                <TagLabel
                  color={isAccepted(actor?.status) ? 'white' : 'green.500'}
                >
                  Yes
                </TagLabel>
              </Tag>
              <Tag
                bg={isDeclined(actor?.status) ? 'red.250' : 'transparent'}
                borderWidth={1}
                borderColor={'red.250'}
                rounded="full"
                px={3}
                fontSize={{
                  lg: '16px',
                  md: '14px',
                  base: '12px',
                }}
                onClick={() => handleRSVP(AttendeeStatus.DECLINED)}
                cursor="pointer"
              >
                <TagLabel
                  color={isDeclined(actor?.status) ? 'white' : 'red.250'}
                >
                  No
                </TagLabel>
              </Tag>
              <Tag
                bg={
                  isPendingAction(actor?.status) ? 'primary.300' : 'transparent'
                }
                borderWidth={1}
                borderColor={'primary.300'}
                rounded="full"
                px={3}
                fontSize={{
                  lg: '16px',
                  md: '14px',
                  base: '12px',
                }}
                onClick={() => handleRSVP(AttendeeStatus.NEEDS_ACTION)}
                cursor="pointer"
              >
                <TagLabel
                  color={
                    isPendingAction(actor?.status) ? 'white' : 'primary.300'
                  }
                >
                  Maybe
                </TagLabel>
              </Tag>
            </HStack>
          </HStack>
        </VStack>
      </Box>
      <DeleteEventDialog
        isOpen={isOpen}
        onClose={onClose}
        event={event}
        afterCancel={() => removeEventFromCache(event.sourceEventId)}
        participants={participants}
      />
    </Box>
  )
}

export default CalendarEventCard

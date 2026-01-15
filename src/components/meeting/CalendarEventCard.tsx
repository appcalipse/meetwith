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
      bgColor={bgColor}
      borderRadius="lg"
      mt={3}
      position="relative"
      pt={{
        base: 3,
        md: 2,
      }}
      shadow="sm"
      width="100%"
    >
      <HStack position="absolute" right={0} top={0}>
        {label && (
          <Badge
            alignSelf="flex-end"
            borderBottomRightRadius={4}
            borderRadius={0}
            colorScheme={label.color}
            px={2}
            py={1}
          >
            {label.text}
          </Badge>
        )}
        {isRecurring && recurrenceLabel && (
          <Badge
            alignSelf="flex-end"
            borderBottomRightRadius={4}
            borderRadius={0}
            colorScheme={'gray'}
            px={2}
            py={1}
          >
            Recurrence: {recurrenceLabel}
          </Badge>
        )}{' '}
        <Badge
          borderBottomRightRadius={4}
          borderRadius={0}
          colorScheme={'primary'}
          fontSize="xs"
          px={2}
          py={1}
        >
          {event.source}
        </Badge>
      </HStack>
      <Box maxWidth="100%" p={6} pt={isRecurring ? 8 : 6}>
        <VStack alignItems="start" gap={6} position="relative">
          <Flex
            alignItems="start"
            flexDirection={{
              base: 'column-reverse',
              md: 'row',
            }}
            flexWrap="wrap"
            gap={4}
            w="100%"
          >
            <VStack alignItems="start" flex={1}>
              <Flex alignItems="center" flex={1} gap={3}>
                <Heading fontSize="24px">
                  <strong>{event?.title || 'No Title'}</strong>
                </Heading>
              </Flex>
              <Text alignItems="start" fontSize="16px">
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
                _hover={{
                  textDecoration: 'none',
                }}
                flex={1}
                href={addUTMParams(event?.meeting_url || '')}
                isExternal
                maxWidth="100%"
                onClick={() => logEvent('Joined a meeting')}
                overflow="hidden"
                textDecoration="none"
                textOverflow="ellipsis"
                whiteSpace="nowrap"
              >
                <Button colorScheme="primary">Join meeting</Button>
              </Link>
              <Tooltip label="Delete meeting" placement="top">
                <IconButton
                  aria-label="delete"
                  color={iconColor}
                  icon={<FaTrash size={16} />}
                  onClick={onOpen}
                />
              </Tooltip>
            </HStack>
          </Flex>

          <Divider />
          <VStack alignItems="start" maxWidth="100%">
            <HStack alignItems="flex-start" maxWidth="100%">
              <Text display="inline" whiteSpace="balance" width="100%">
                <strong>Participants: </strong>
                {participants || 'No participants'}
              </Text>
            </HStack>
            <HStack
              alignItems="flex-start"
              flexWrap="wrap"
              gap={2}
              maxWidth="100%"
              width="100%"
            >
              <Text fontWeight={700} whiteSpace="nowrap">
                Meeting link:
              </Text>
              <Flex flex={1} overflow="hidden">
                <Link
                  href={addUTMParams(event.meeting_url || '')}
                  isExternal
                  onClick={() => logEvent('Clicked to start meeting')}
                  overflow="hidden"
                  textOverflow="ellipsis"
                  whiteSpace="nowrap"
                >
                  {event.meeting_url}
                </Link>
                <Tooltip
                  isOpen={copyFeedbackOpen}
                  label="Link copied"
                  placement="top"
                >
                  <Button
                    colorScheme="primary"
                    leftIcon={
                      <FaRegCopy cursor="pointer" display="block" size={16} />
                    }
                    onClick={() => handleCopy(event.meeting_url || '')}
                    variant="link"
                    w={4}
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
                  className="rich-text-wrapper"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(event.description.trim(), {
                      allowedAttributes: false,
                      allowVulnerableTags: false,
                    }),
                  }}
                  suppressHydrationWarning
                  whiteSpace="pre-wrap"
                  width="100%"
                  wordBreak="break-word"
                />
              </HStack>
            )}
          </VStack>
          <HStack alignItems="center" gap={3.5}>
            <Text fontWeight={700}>RSVP:</Text>
            <HStack alignItems="center" gap={2}>
              <Tag
                bg={isAccepted(actor?.status) ? 'green.500' : 'transparent'}
                borderColor={'green.500'}
                borderWidth={1}
                cursor="pointer"
                fontSize={{
                  lg: '16px',
                  md: '14px',
                  base: '12px',
                }}
                onClick={() => handleRSVP(AttendeeStatus.ACCEPTED)}
                px={3}
                rounded="full"
              >
                <TagLabel
                  color={isAccepted(actor?.status) ? 'white' : 'green.500'}
                >
                  Yes
                </TagLabel>
              </Tag>
              <Tag
                bg={isDeclined(actor?.status) ? 'red.250' : 'transparent'}
                borderColor={'red.250'}
                borderWidth={1}
                cursor="pointer"
                fontSize={{
                  lg: '16px',
                  md: '14px',
                  base: '12px',
                }}
                onClick={() => handleRSVP(AttendeeStatus.DECLINED)}
                px={3}
                rounded="full"
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
                borderColor={'primary.300'}
                borderWidth={1}
                cursor="pointer"
                fontSize={{
                  lg: '16px',
                  md: '14px',
                  base: '12px',
                }}
                onClick={() => handleRSVP(AttendeeStatus.NEEDS_ACTION)}
                px={3}
                rounded="full"
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
        afterCancel={() => removeEventFromCache(event.sourceEventId)}
        event={event}
        isOpen={isOpen}
        onClose={onClose}
      />
    </Box>
  )
}

export default CalendarEventCard

import {
  Divider,
  Flex,
  Heading,
  HStack,
  Link,
  Text,
  VStack,
} from '@chakra-ui/layout'
import {
  Button,
  IconButton,
  Tag,
  TagLabel,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react'
import { DateTime } from 'luxon'
import * as React from 'react'
import { FaEdit } from 'react-icons/fa'
import { FaRegCopy } from 'react-icons/fa6'
import { MdCancel } from 'react-icons/md'

import useAccountContext from '@/hooks/useAccountContext'
import useClipboard from '@/hooks/useClipboard'
import {
  CalendarEventsData,
  createEventsQueryKey,
  useCalendarContext,
} from '@/providers/calendar/CalendarContext'
import {
  isAccepted,
  isDeclined,
  isPendingAction,
  UnifiedEvent,
  WithInterval,
} from '@/types/Calendar'
import { MeetingDecrypted } from '@/types/Meeting'
import { ParticipationStatus } from '@/types/ParticipantInfo'
import { logEvent } from '@/utils/analytics'
import { dateToLocalizedRange, rsvpMeeting } from '@/utils/calendar_manager'
import { MeetingPermissions } from '@/utils/constants/schedule'
import {
  canAccountAccessPermission,
  isAccountSchedulerOrOwner,
} from '@/utils/generic_utils'
import { addUTMParams } from '@/utils/huddle.helper'
import { queryClient } from '@/utils/react_query'
import { getAllParticipantsDisplayName } from '@/utils/user_manager'

import { TruncatedText } from './TruncatedText'

interface EventDetailsPopOverProps {
  slot: WithInterval<UnifiedEvent<DateTime> | MeetingDecrypted<DateTime>>
  onSelectEvent: () => void
  onClose: () => void
  onCancelOpen: () => void
}
const isCalendarEvent = (
  slot: WithInterval<UnifiedEvent<DateTime> | MeetingDecrypted<DateTime>>
): slot is WithInterval<UnifiedEvent<DateTime>> => {
  return 'calendarId' in slot
}
const EventDetailsPopOver: React.FC<EventDetailsPopOverProps> = ({
  slot,
  onSelectEvent,
  onCancelOpen,
}) => {
  const rsvpAbortControllerRef = React.useRef<AbortController | null>(null)

  const { currrentDate } = useCalendarContext()
  const currentAccount = useAccountContext()
  const { copyFeedbackOpen, handleCopy } = useClipboard()
  const isSchedulerOrOwner =
    !isCalendarEvent(slot) &&
    isAccountSchedulerOrOwner(slot?.participants, currentAccount?.address)
  const iconColor = useColorModeValue('gray.500', 'gray.200')

  const participants = React.useMemo(() => {
    if (isCalendarEvent(slot)) {
      const result: string[] = []
      for (const attendee of slot.attendees || []) {
        let display = ''
        if (attendee.email === slot.accountEmail) {
          display = 'You'
        } else if (attendee.name) {
          display = attendee.name
        } else if (attendee.email) {
          display = attendee.email
        }
        if (attendee.isOrganizer) {
          display = `${display} (Organizer)`
        }
      }
      return result.join(', ')
    } else {
      const canSeeGuestList = canAccountAccessPermission(
        slot?.permissions,
        slot?.participants || [],
        currentAccount?.address,
        MeetingPermissions.SEE_GUEST_LIST
      )
      return getAllParticipantsDisplayName(
        slot.participants,
        currentAccount!.address,
        canSeeGuestList
      )
    }
  }, [currentAccount])
  const actor = React.useMemo(() => {
    if (isCalendarEvent(slot)) {
      return slot.attendees?.find(
        attendee => attendee.email === slot.accountEmail
      )
    } else {
      return slot.participants.find(
        participant => participant.account_address === currentAccount?.address
      )
    }
  }, [slot, currentAccount])
  const handleRSVP = async (status: ParticipationStatus) => {
    if (isCalendarEvent(slot) || !actor || !currentAccount) return
    if (status === actor.status) return
    // cancel any in-flight rsvp request
    if (rsvpAbortControllerRef.current) {
      rsvpAbortControllerRef.current.abort()
    }

    const abortController = new AbortController()
    rsvpAbortControllerRef.current = abortController

    logEvent(`Clicked RSVP ${status} from Event Details PopOver`)

    queryClient.setQueryData<CalendarEventsData>(
      createEventsQueryKey(currrentDate),
      old => {
        if (!old?.mwwEvents) return old
        return {
          ...old,
          mwwEvents: old.mwwEvents.map((event: MeetingDecrypted) => {
            if (event.id !== slot.id) return event
            return {
              ...event,
              participants: event.participants.map(p =>
                p.account_address === currentAccount?.address
                  ? { ...p, status }
                  : p
              ),
            }
          }),
        }
      }
    )

    try {
      await rsvpMeeting(
        slot.id,
        currentAccount.address,
        status,
        abortController.signal
      )
    } catch (error) {
      console.error('Failed to update RSVP:', error)
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was cancelled, ignore
        return
      }
      queryClient.invalidateQueries(createEventsQueryKey(currrentDate))
    }
  }

  return (
    <VStack width="100%" align="start" gap={6} p={4}>
      <VStack width="100%" align="start" gap={4}>
        <Heading fontWeight={500} fontSize={'24px'}>
          {slot.title}
        </Heading>
        <Text fontWeight={700} fontSize={'16px'}>
          {dateToLocalizedRange(
            slot.start.toJSDate(),
            slot.end.toJSDate(),
            Intl.DateTimeFormat().resolvedOptions().timeZone,
            true
          )}
        </Text>
      </VStack>
      <Divider />
      <VStack width="100%" align="start" gap={4}>
        {participants.length > 0 && (
          <Text display="inline" width="100%" whiteSpace="balance">
            Participants:
            <strong>{participants}</strong>
          </Text>
        )}
        {(isCalendarEvent(slot) ? slot.description : slot.content) && (
          <HStack alignItems="center" flexWrap="wrap">
            <Text>Description:</Text>
            <TruncatedText
              content={
                (isCalendarEvent(slot) ? slot.description : slot.content) || ''
              }
              maxHeight={'100px'}
            />
          </HStack>
        )}
        {slot.meeting_url && (
          <HStack
            alignItems="flex-start"
            maxWidth="100%"
            flexWrap="wrap"
            gap={2}
            width="100%"
          >
            <Text whiteSpace="nowrap">Meeting link:</Text>
            <Flex flex={1} overflow="hidden">
              <Link
                whiteSpace="nowrap"
                textOverflow="ellipsis"
                overflow="hidden"
                href={addUTMParams(slot.meeting_url || '')}
                isExternal
                onClick={() => logEvent('Clicked to start meeting')}
                fontWeight={700}
              >
                {slot.meeting_url}
              </Link>
              <Tooltip
                label="Link copied"
                placement="top"
                isOpen={copyFeedbackOpen}
              >
                <Button
                  w={4}
                  colorScheme="white"
                  variant="link"
                  onClick={() => handleCopy(slot.meeting_url || '')}
                  leftIcon={<FaRegCopy />}
                />
              </Tooltip>
            </Flex>
          </HStack>
        )}
      </VStack>
      <HStack>
        {slot.meeting_url && (
          <Link
            href={addUTMParams(slot?.meeting_url || '')}
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
        )}
        {!isCalendarEvent(slot) && (
          <Tooltip label="Edit meeting" placement="top">
            <IconButton
              color={iconColor}
              aria-label="edit"
              icon={<FaEdit size={16} />}
              onClick={onSelectEvent}
            />
          </Tooltip>
        )}
        {isSchedulerOrOwner && !isCalendarEvent(slot) && (
          <Tooltip label="Cancel meeting" placement="top">
            <IconButton
              color={iconColor}
              aria-label="remove"
              icon={<MdCancel size={16} />}
              onClick={onCancelOpen}
            />
          </Tooltip>
        )}
      </HStack>
      {actor && !isCalendarEvent(slot) && (
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
              onClick={() => {
                if (!isCalendarEvent(slot)) {
                  handleRSVP(ParticipationStatus.Accepted)
                }
              }}
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
              onClick={() => {
                if (!isCalendarEvent(slot)) {
                  handleRSVP(ParticipationStatus.Rejected)
                }
              }}
            >
              <TagLabel color={isDeclined(actor?.status) ? 'white' : 'red.250'}>
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
              onClick={() => {
                if (!isCalendarEvent(slot)) {
                  handleRSVP(ParticipationStatus.Pending)
                }
              }}
            >
              <TagLabel
                color={isPendingAction(actor?.status) ? 'white' : 'primary.300'}
              >
                Maybe
              </TagLabel>
            </Tag>
          </HStack>
        </HStack>
      )}
    </VStack>
  )
}

export default EventDetailsPopOver

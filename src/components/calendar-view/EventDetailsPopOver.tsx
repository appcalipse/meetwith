import { Flex, Heading, HStack, Link, Text, VStack } from '@chakra-ui/layout'
import {
  Button,
  IconButton,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react'
import { DateTime } from 'luxon'
import * as React from 'react'
import { FaEdit } from 'react-icons/fa'
import { FaRegCopy } from 'react-icons/fa6'
import { MdCancel } from 'react-icons/md'
import sanitizeHtml from 'sanitize-html'

import useAccountContext from '@/hooks/useAccountContext'
import { WithInterval } from '@/providers/calendar/CalendarContext'
import { UnifiedEvent } from '@/types/Calendar'
import { MeetingDecrypted } from '@/types/Meeting'
import { logEvent } from '@/utils/analytics'
import { MeetingPermissions } from '@/utils/constants/schedule'
import { canAccountAccessPermission } from '@/utils/generic_utils'
import { addUTMParams } from '@/utils/huddle.helper'
import { getAllParticipantsDisplayName } from '@/utils/user_manager'

interface EventDetailsPopOverProps {
  slot: WithInterval<UnifiedEvent<DateTime> | MeetingDecrypted<DateTime>>
}
const isCalendarEvent = (
  slot: WithInterval<UnifiedEvent<DateTime> | MeetingDecrypted<DateTime>>
): slot is WithInterval<UnifiedEvent<DateTime>> => {
  return 'calendarId' in slot
}
const EventDetailsPopOver: React.FC<EventDetailsPopOverProps> = ({ slot }) => {
  const currentAccount = useAccountContext()
  const [copyFeedbackOpen, setCopyFeedbackOpen] = React.useState(false)
  const iconColor = useColorModeValue('gray.500', 'gray.200')

  const getNamesDisplay = React.useCallback(() => {
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
  const handleCopy = async () => {
    try {
      if ('clipboard' in navigator) {
        await navigator.clipboard.writeText(slot?.meeting_url || '')
      } else {
        document.execCommand('copy', true, slot?.meeting_url || '')
      }
    } catch (err) {
      document.execCommand('copy', true, slot?.meeting_url || '')
    }
    logEvent('Copied link from Calendar', { url: slot?.meeting_url || '' })
    setCopyFeedbackOpen(true)
    setTimeout(() => {
      setCopyFeedbackOpen(false)
    }, 2000)
  }
  const participants = getNamesDisplay()
  return (
    <VStack width="100%" align="start">
      <Heading>{slot.title}</Heading>

      {participants.length > 0 && (
        <Text display="inline" width="100%" whiteSpace="balance">
          <strong>Participants: </strong>
          {participants}
        </Text>
      )}
      {(isCalendarEvent(slot) ? slot.description : slot.content) && (
        <HStack alignItems="flex-start" flexWrap="wrap">
          <Text>
            <strong>Description:</strong>
          </Text>
          <Text
            w="350px"
            whiteSpace="nowrap"
            overflow="hidden"
            textOverflow="ellipsis"
            fontSize="xs"
            suppressHydrationWarning
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(
                (isCalendarEvent(slot) ? slot.description : slot.content) || '',
                {
                  allowedAttributes: false,
                  allowVulnerableTags: false,
                }
              ),
            }}
          />
        </HStack>
      )}
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
            href={addUTMParams(slot.meeting_url || '')}
            isExternal
            onClick={() => logEvent('Clicked to start meeting')}
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
              colorScheme="primary"
              variant="link"
              onClick={handleCopy}
              leftIcon={<FaRegCopy />}
            />
          </Tooltip>
        </Flex>
      </HStack>
      <HStack>
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
        <Tooltip label="Edit meeting" placement="top">
          <IconButton
            color={iconColor}
            aria-label="edit"
            icon={<FaEdit size={16} />}
            // onClick={handleEditMeeting}
          />
        </Tooltip>
        <Tooltip label="Cancel meeting for everyone" placement="top">
          <IconButton
            color={iconColor}
            aria-label="remove"
            icon={<MdCancel size={16} />}
            // onClick={onCancelOpen}
          />
        </Tooltip>
      </HStack>
    </VStack>
  )
}

export default EventDetailsPopOver

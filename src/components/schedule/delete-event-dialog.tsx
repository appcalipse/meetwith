import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogOverlay,
  Button,
  Heading,
  Text,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { differenceInMinutes } from 'date-fns'
import React, { useMemo, useState } from 'react'

import { useScheduleActions } from '@/providers/schedule/ActionsContext'
import { Account } from '@/types/Account'
import { AttendeeStatus, UnifiedAttendee, UnifiedEvent } from '@/types/Calendar'
import { MeetingDecrypted } from '@/types/Meeting'
import { deleteCalendarEvent } from '@/utils/api_helper'
import { MeetingPermissions } from '@/utils/constants/schedule'
import { canAccountAccessPermission } from '@/utils/generic_utils'
import { getAllParticipantsDisplayName } from '@/utils/user_manager'

interface DeleteMeetingDialogProps {
  event: UnifiedEvent
  afterCancel?: () => void
  isOpen: boolean
  onClose: () => void
}

export const DeleteEventDialog: React.FC<DeleteMeetingDialogProps> = ({
  event,
  isOpen,
  onClose,
  afterCancel,
}) => {
  const cancelRef = React.useRef<HTMLButtonElement>(null)
  const [isDeleting, _setIsDeleting] = useState(false)
  const setIsDeleting = (isDeleting: boolean) => {
    _setIsDeleting(isDeleting)
  }
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
  const toast = useToast()
  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteCalendarEvent(event.calendarId, event.sourceEventId)
      afterCancel && afterCancel()
      onClose()
    } catch (error: unknown) {
      toast({
        title: 'Something went wrong cancelling your meeting',
        description:
          error instanceof Error ? error.message : 'An unknown error occurred',
        status: 'error',
        duration: 5000,
        position: 'top',
        isClosable: true,
      })
    } finally {
      setIsDeleting(false)
    }
  }
  return (
    <AlertDialog
      isOpen={isOpen}
      leastDestructiveRef={cancelRef}
      onClose={onClose}
    >
      <AlertDialogOverlay>
        <AlertDialogContent>
          <VStack p={6} pb={1} alignItems="flex-start" gap={3}>
            <Heading size="md">Delete Event</Heading>
            <Text>
              <strong> Meeting Title:</strong> {event?.title || 'No Title'}
            </Text>
            {event?.end && (
              <Text>
                <strong>Meeting Duration: </strong>
                {differenceInMinutes(event?.end, event?.start)} Minutes
              </Text>
            )}
            {participants && (
              <Text display="inline" width="100%" whiteSpace="balance">
                <strong>Participants: </strong>
                {participants}
              </Text>
            )}
          </VStack>
          <AlertDialogBody>
            Are you sure? You can&apos;t undo this action afterwards.
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={onClose} isDisabled={isDeleting}>
              Do not delete
            </Button>
            <Button
              colorScheme="red"
              onClick={handleDelete}
              ml={3}
              isLoading={isDeleting}
            >
              Delete Event
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  )
}

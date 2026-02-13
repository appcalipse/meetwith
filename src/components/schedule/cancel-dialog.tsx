import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogOverlay,
  Button,
  Text,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { differenceInMinutes } from 'date-fns'
import { DateTime } from 'luxon'
import React, { useState } from 'react'

import { Account } from '@/types/Account'
import { MeetingDecrypted } from '@/types/Meeting'
import {
  cancelMeeting,
  cancelMeetingInstance,
  cancelMeetingSeries,
} from '@/utils/calendar_manager'
import { UpdateMode } from '@/utils/constants/meeting'
import { getAllParticipantsDisplayName } from '@/utils/user_manager'

interface CancelMeetingDialogProps {
  decryptedMeeting?: MeetingDecrypted | MeetingDecrypted<DateTime>
  currentAccount?: Account | null
  onCancelChange?: (isCancelling: boolean) => void
  afterCancel?: (slotsRemoved: string[]) => void | Promise<unknown>
  isOpen: boolean
  onClose: () => void
  editMode?: UpdateMode
}

export const CancelMeetingDialog: React.FC<CancelMeetingDialogProps> = ({
  decryptedMeeting,
  currentAccount,
  onCancelChange,
  afterCancel,
  isOpen,
  onClose,
  editMode,
}) => {
  const cancelRef = React.useRef<HTMLButtonElement>(null)
  const [cancelling, _setCancelling] = useState(false)
  const setCancelling = (isCancelling: boolean) => {
    onCancelChange && onCancelChange(isCancelling)
    _setCancelling(isCancelling)
  }
  const meetingInfo = decryptedMeeting
    ? {
        ...decryptedMeeting,
        start:
          decryptedMeeting.start instanceof DateTime
            ? decryptedMeeting?.start.toJSDate()
            : decryptedMeeting?.start,
        end:
          decryptedMeeting.end instanceof DateTime
            ? decryptedMeeting.end.toJSDate()
            : decryptedMeeting.end,
      }
    : undefined
  const toast = useToast()
  const getNamesDisplay = (meeting: MeetingDecrypted) => {
    return getAllParticipantsDisplayName(
      meeting.participants,
      currentAccount!.address
    )
  }
  if (!meetingInfo) return null
  return (
    <AlertDialog
      isOpen={isOpen}
      leastDestructiveRef={cancelRef}
      onClose={onClose}
    >
      <AlertDialogOverlay>
        <AlertDialogContent>
          <VStack p={6} pb={1} alignItems="flex-start" gap={3}>
            <Text>
              <strong> Meeting Title:</strong>{' '}
              {decryptedMeeting?.title || 'No Title'}
            </Text>
            {meetingInfo?.end && (
              <Text>
                <strong>Meeting Duration: </strong>
                {differenceInMinutes(meetingInfo?.end, meetingInfo?.start)}{' '}
                Minutes
              </Text>
            )}
            {decryptedMeeting && (
              <Text display="inline" width="100%" whiteSpace="balance">
                <strong>Participants: </strong>
                {getNamesDisplay(meetingInfo)}
              </Text>
            )}
          </VStack>
          <AlertDialogBody>
            Are you sure? You can&apos;t undo this action afterwards.
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={onClose} isDisabled={cancelling}>
              Do not cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={() => {
                if (!decryptedMeeting) return
                setCancelling(true)
                let handler: Promise<{ removed: string[] }>
                if (decryptedMeeting.id.includes('_')) {
                  if (editMode === UpdateMode.SINGLE_EVENT) {
                    handler = cancelMeetingInstance(
                      currentAccount!.address,
                      meetingInfo.id,
                      meetingInfo
                    )
                  } else {
                    handler = cancelMeetingSeries(
                      meetingInfo.id,
                      currentAccount!.address
                    )
                  }
                } else {
                  handler = cancelMeeting(currentAccount!.address, meetingInfo)
                }
                handler
                  .then(async ({ removed }) => {
                    try {
                      afterCancel && (await afterCancel(removed))
                    } catch (err) {
                      console.error('Error in afterCancel:', err)
                    }
                    setCancelling(false)
                    onClose()
                  })
                  .catch(error => {
                    setCancelling(false)
                    toast({
                      title: 'Something went wrong cancelling your meeting',
                      description: error.message,
                      status: 'error',
                      duration: 5000,
                      position: 'top',
                      isClosable: true,
                    })
                  })
              }}
              ml={3}
              isLoading={cancelling}
            >
              Cancel meeting
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  )
}

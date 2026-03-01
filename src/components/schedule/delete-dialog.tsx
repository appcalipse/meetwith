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
import React, { useState } from 'react'

import { useScheduleActions } from '@/providers/schedule/ActionsContext'
import { Account } from '@/types/Account'
import { MeetingDecrypted } from '@/types/Meeting'
import { MeetingPermissions } from '@/utils/constants/schedule'
import { canAccountAccessPermission } from '@/utils/generic_utils'
import { getAllParticipantsDisplayName } from '@/utils/user_manager'

interface DeleteMeetingDialogProps {
  decryptedMeeting?: MeetingDecrypted
  currentAccount?: Account | null
  onDeleteChange?: (isDeleting: boolean) => void
  afterCancel?: (slotsRemoved: string[], skipToast?: boolean) => void
  isOpen: boolean
  onClose: () => void
}

export const DeleteMeetingDialog: React.FC<DeleteMeetingDialogProps> = ({
  decryptedMeeting,
  currentAccount,
  onDeleteChange: onDeleteChange,
  isOpen,
  onClose,
  afterCancel,
}) => {
  const { handleDelete } = useScheduleActions()

  const cancelRef = React.useRef<HTMLButtonElement>(null)
  const [isDeleting, _setIsDeleting] = useState(false)
  const setIsDeleting = (isDeleting: boolean) => {
    onDeleteChange && onDeleteChange(isDeleting)
    _setIsDeleting(isDeleting)
  }
  const canSeeGuestList = canAccountAccessPermission(
    decryptedMeeting?.permissions,
    decryptedMeeting?.participants || [],
    currentAccount?.address,
    MeetingPermissions.SEE_GUEST_LIST
  )
  const toast = useToast()

  const getNamesDisplay = (meeting: MeetingDecrypted) => {
    return getAllParticipantsDisplayName(
      meeting.participants,
      currentAccount?.address,
      canSeeGuestList
    )
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
            <Text>
              <strong> Meeting Title:</strong>{' '}
              {decryptedMeeting?.title || 'No Title'}
            </Text>
            {decryptedMeeting?.end && (
              <Text>
                <strong>Meeting Duration: </strong>
                {differenceInMinutes(
                  decryptedMeeting?.end,
                  decryptedMeeting?.start
                )}{' '}
                Minutes
              </Text>
            )}
            {decryptedMeeting && (
              <Text display="inline" width="100%" whiteSpace="balance">
                <strong>Participants: </strong>
                {getNamesDisplay(decryptedMeeting)}
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
              onClick={() => {
                setIsDeleting(true)
                handleDelete(undefined, decryptedMeeting)
                  .then(() => {
                    setIsDeleting(false)
                    afterCancel &&
                      afterCancel([decryptedMeeting?.id || ''], true)
                    onClose()
                  })
                  .catch(error => {
                    setIsDeleting(false)
                    toast({
                      title: 'Something went wrong deleting your meeting',
                      description: error.message,
                      status: 'error',
                      duration: 5000,
                      position: 'top',
                      isClosable: true,
                    })
                  })
              }}
              ml={3}
              isLoading={isDeleting}
            >
              Delete meeting
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  )
}

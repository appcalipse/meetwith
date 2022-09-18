import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
  useToast,
} from '@chakra-ui/react'
import React, { useState } from 'react'

import { Account } from '@/types/Account'
import { MeetingDecrypted } from '@/types/Meeting'
import { cancelMeeting } from '@/utils/calendar_manager'

interface CancelMeetingDialogProps {
  decriptedMeeting?: MeetingDecrypted
  currentAccount?: Account | null
  afterCancel?: () => void
  isOpen: boolean
  onClose: () => void
}

export const CancelMeetingDialog: React.FC<CancelMeetingDialogProps> = ({
  decriptedMeeting,
  currentAccount,
  afterCancel,
  isOpen,
  onClose,
}) => {
  const cancelRef = React.useRef<HTMLButtonElement>(null)
  const [cancelling, setCancelling] = useState(false)
  const toast = useToast()

  return (
    <AlertDialog
      isOpen={isOpen}
      leastDestructiveRef={cancelRef}
      onClose={onClose}
    >
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Cancel meeting
          </AlertDialogHeader>

          <AlertDialogBody>
            Are you sure? You can&apos;t undo this action afterwards.
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={onClose}>
              Do not cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={() => {
                setCancelling(true)
                cancelMeeting(currentAccount!.address, decriptedMeeting!)
                  .then(() => {
                    setCancelling(false)
                    afterCancel && afterCancel()
                    onClose()
                  })
                  .catch(error => {
                    setCancelling(false)
                    toast({
                      title: 'Something went wrong cancelling yout meeting',
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

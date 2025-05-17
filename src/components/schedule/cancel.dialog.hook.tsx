import { useDisclosure } from '@chakra-ui/react'
import React, { useState } from 'react'

import { Account } from '@/types/Account'
import { DBSlot, MeetingChangeType, MeetingDecrypted } from '@/types/Meeting'

import { CancelMeetingDialog } from './cancel-dialog'

export interface MeetingDialogState {
  meeting?: DBSlot
  decryptedMeeting?: MeetingDecrypted
  afterClose?: (
    changeType: MeetingChangeType,
    meeting?: DBSlot,
    removedSlots?: string[]
  ) => void
  currentAccount?: Account
}

export const useCancelDialog = () => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [data, setData] = useState<MeetingDialogState>({
    meeting: undefined,
    decryptedMeeting: undefined,
  })

  const openCancelDialog = (
    meeting: DBSlot,
    decryptedMeeting?: MeetingDecrypted,
    afterClose?: (
      changeType: MeetingChangeType,
      meeting?: DBSlot,
      removedSlots?: string[]
    ) => void,
    currentAccount?: Account
  ) => {
    setData({
      meeting,
      decryptedMeeting,
      afterClose,
      currentAccount,
    })
    onOpen()
  }

  const CancelDialog: React.FC = () => {
    return (
      <CancelMeetingDialog
        isOpen={isOpen}
        onClose={onClose}
        decryptedMeeting={data.decryptedMeeting}
        currentAccount={data?.currentAccount}
        afterCancel={removed =>
          data?.afterClose?.(MeetingChangeType.DELETE, undefined, removed)
        }
      />
    )
  }

  return { CancelDialog, openCancelDialog }
}

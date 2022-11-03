import { useDisclosure } from '@chakra-ui/react'
import React, { useState } from 'react'

import { DBSlot, MeetingChangeType, MeetingDecrypted } from '@/types/Meeting'

import { BaseMeetingDialog } from './base-dialog'

export interface MeetingDialogState {
  meeting?: DBSlot
  timezone: string
  decryptedMeeting?: MeetingDecrypted
  afterClose?: (
    changeType: MeetingChangeType,
    meeting?: DBSlot,
    removedSlots?: string[]
  ) => void
}

export const useMeetingDialog = () => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [data, setData] = useState<MeetingDialogState>({
    meeting: undefined,
    decryptedMeeting: undefined,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  })

  const openMeetingDialog = (
    meeting: any,
    decryptedMeeting: any,
    timezone: string,
    afterClose?: (
      changeType: MeetingChangeType,
      meeting?: DBSlot,
      removedSlots?: string[]
    ) => void
  ) => {
    setData({
      meeting,
      decryptedMeeting,
      timezone,
      afterClose,
    })
    onOpen()
  }

  const closeMeetingDialog = (
    changeType: MeetingChangeType,
    meeting?: DBSlot,
    removedSlots?: string[]
  ) => {
    onClose()
    data.afterClose && data.afterClose(changeType, meeting, removedSlots)
    setData({
      meeting: undefined,
      decryptedMeeting: undefined,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
  }

  const MeetingDialog: React.FC = () => {
    return (
      <BaseMeetingDialog
        isDialogOpen={isOpen}
        onDialogClose={closeMeetingDialog}
        onDialogOpen={onOpen}
        meeting={data.meeting}
        decryptedMeeting={data.decryptedMeeting}
        timezone={data.timezone}
      />
    )
  }

  return [MeetingDialog as any, openMeetingDialog]
}

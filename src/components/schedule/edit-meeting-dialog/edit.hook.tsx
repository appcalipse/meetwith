import { useDisclosure } from '@chakra-ui/react'
import React, { useState } from 'react'

import { EditMeetingDialog } from '.'

export const useEditMeetingDialog = () => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [data, setData] = useState<any>({
    meeting: null,
    decryptedMeeting: null,
    timezone: null,
  })

  const openEditModal = (
    meeting: any,
    decryptedMeeting: any,
    timezone: string
  ) => {
    setData({
      meeting,
      decryptedMeeting,
      timezone,
    })
    onOpen()
  }

  const closeEditModal = () => {
    setData({
      meeting: null,
      decryptedMeeting: null,
      timezone: null,
    })
    onClose()
  }

  const EditModal: React.FC = () => {
    if (!data.meeting) {
      return <React.Fragment />
    }

    return (
      <EditMeetingDialog
        isOpen={isOpen}
        onClose={onClose}
        onOpen={onOpen}
        meeting={data.meeting}
        decrypted={data.decryptedMeeting}
        timezone={data.timezone}
      />
    )
  }

  return [EditModal, openEditModal, closeEditModal]
}

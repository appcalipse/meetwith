import {
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
} from '@chakra-ui/react'
import React from 'react'

import { MeetingMembers } from '../ScheduleTimeDiscover'
import { ScheduleParticipants } from './ScheduleParticipants'

export interface IMobileScheduleParticipantModal {
  onClose: () => void
  isOpen: boolean
  meetingMembers: MeetingMembers[]
}

const MobileScheduleParticipantModal: React.FC<
  IMobileScheduleParticipantModal
> = props => {
  return (
    <Modal
      onClose={props.onClose}
      isOpen={props.isOpen}
      blockScrollOnMount={false}
      size={'lg'}
      isCentered
    >
      <ModalOverlay />
      <ModalContent w="fit-content" h="fit-content">
        <ModalCloseButton />
        <ScheduleParticipants meetingMembers={props.meetingMembers} isMobile />
      </ModalContent>
    </Modal>
  )
}

export default MobileScheduleParticipantModal

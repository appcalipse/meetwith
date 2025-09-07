import {
  Box,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
} from '@chakra-ui/react'
import React from 'react'

import { ScheduleParticipants } from './ScheduleParticipants'

export interface IMobileScheduleParticipantModal {
  onClose: () => void
  isOpen: boolean
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
      closeOnOverlayClick
    >
      <ModalOverlay bg="#131A20CC" backdropFilter={'blur(25px)'} />
      <ModalContent
        w="fit-content"
        maxW="90%"
        h="fit-content"
        bg="none"
        shadow="none"
      >
        <ModalCloseButton zIndex={90} size={'25'} />
        <Box height={10} w={'100%'} bg="none" />
        <ScheduleParticipants isMobile />
      </ModalContent>
    </Modal>
  )
}

export default MobileScheduleParticipantModal

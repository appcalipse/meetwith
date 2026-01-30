import {
  Box,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
} from '@chakra-ui/react'
import React from 'react'

import { QuickPollBySlugResponse } from '@/types/QuickPoll'

import { QuickPollParticipants } from './QuickPollParticipants'

export interface IMobileQuickPollParticipantModal {
  onClose: () => void
  isOpen: boolean
  pollData?: QuickPollBySlugResponse
}

const MobileQuickPollParticipantModal: React.FC<
  IMobileQuickPollParticipantModal
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
        w="85%"
        justifyContent="center"
        h="fit-content"
        bg="none"
        shadow="none"
      >
        <ModalCloseButton zIndex={90} size={'25'} />
        <Box height={10} w={'100%'} bg="none" />
        <QuickPollParticipants
          isMobile
          pollData={props.pollData}
          onClose={props.onClose}
        />
      </ModalContent>
    </Modal>
  )
}

export default MobileQuickPollParticipantModal

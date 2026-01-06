import {
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
} from '@chakra-ui/react'
import type { FC } from 'react'

import CalendarPicker from './CalendarPicker'
import ConnectCalendarButton from './ConnectCalendarButton'
import ConnectedCalendar from './ConnectedCalendar'

interface MobileControllerModalProps {
  isOpen: boolean
  onClose: () => void
}

const MobileControllerModal: FC<MobileControllerModalProps> = ({
  isOpen,
  onClose,
}) => {
  return (
    <Modal
      onClose={onClose}
      isOpen={isOpen}
      blockScrollOnMount={false}
      size={'lg'}
      isCentered
    >
      <ModalOverlay bg="#131A20CC" backdropFilter={'blur(25px)'} />
      <ModalContent
        h="fit-content"
        p={3}
        alignItems="start"
        justifyContent="flex-start"
        borderRightWidth={1}
        borderColor="menu-button-hover"
        bg="bg-event"
        gap={3}
        maxW={'300px'}
      >
        <ModalCloseButton />
        <CalendarPicker />
        <ConnectedCalendar />
        <ConnectCalendarButton />
      </ModalContent>
    </Modal>
  )
}

export default MobileControllerModal

import {
  Button,
  Heading,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
} from '@chakra-ui/react'
import { FaApple, FaGoogle, FaMicrosoft } from 'react-icons/fa'

import { ConnectedCalendarProvider } from '../../types/CalendarConnections'

interface ConnectCalendarProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (provider: ConnectedCalendarProvider) => void
}

const ConnectCalendarModal: React.FC<ConnectCalendarProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      blockScrollOnMount={false}
      size="xl"
      isCentered
    >
      <ModalOverlay>
        <ModalContent maxW="45rem">
          <ModalHeader>
            <Heading size={'md'}>Choose calendar type</Heading>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <HStack p="10" justifyContent="center">
              <Button
                onClick={() => onSelect(ConnectedCalendarProvider.GOOGLE)}
                leftIcon={<FaGoogle />}
                variant="outline"
              >
                Google
              </Button>
              <Button
                onClick={() => onSelect(ConnectedCalendarProvider.ICLOUD)}
                leftIcon={<FaApple />}
                variant="outline"
                disabled
              >
                iCloud (soon)
              </Button>
              <Button
                onClick={() => onSelect(ConnectedCalendarProvider.OUTLOOK)}
                leftIcon={<FaMicrosoft />}
                variant="outline"
                disabled
              >
                Outlook (soon)
              </Button>
              <Button
                onClick={() => onSelect(ConnectedCalendarProvider.OFFICE)}
                leftIcon={<FaMicrosoft />}
                variant="outline"
                disabled
              >
                Office 365 (soon)
              </Button>
            </HStack>
          </ModalBody>
        </ModalContent>
      </ModalOverlay>
    </Modal>
  )
}

export default ConnectCalendarModal

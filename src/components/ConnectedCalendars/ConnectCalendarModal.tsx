import {
  Button,
  Heading,
  HStack,
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
} from '@chakra-ui/react'
import { useState } from 'react'
import { FaApple, FaMicrosoft } from 'react-icons/fa'

import { ConnectedCalendarProvider } from '../../types/CalendarConnections'

interface ConnectCalendarProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (provider: ConnectedCalendarProvider) => Promise<void>
}

const ConnectCalendarModal: React.FC<ConnectCalendarProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const [loading, setLoading] = useState<
    ConnectedCalendarProvider | undefined
  >()
  const selectOption = (provider: ConnectedCalendarProvider) => async () => {
    setLoading(provider)
    await onSelect(provider)
    setLoading(undefined)
  }

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
                onClick={selectOption(ConnectedCalendarProvider.GOOGLE)}
                leftIcon={<Image src="/assets/google.svg" size="24px" />}
                variant="outline"
                isLoading={loading === ConnectedCalendarProvider.GOOGLE}
              >
                Google
              </Button>
              <Button
                onClick={selectOption(ConnectedCalendarProvider.OFFICE)}
                leftIcon={<FaMicrosoft />}
                variant="outline"
                isLoading={loading === ConnectedCalendarProvider.OFFICE}
              >
                Office 365
              </Button>
              <Button
                onClick={selectOption(ConnectedCalendarProvider.ICLOUD)}
                leftIcon={<FaApple />}
                variant="outline"
                disabled
              >
                iCloud (soon)
              </Button>
              <Button
                onClick={selectOption(ConnectedCalendarProvider.OUTLOOK)}
                leftIcon={<FaMicrosoft />}
                variant="outline"
                disabled
              >
                Outlook (soon)
              </Button>
            </HStack>
          </ModalBody>
        </ModalContent>
      </ModalOverlay>
    </Modal>
  )
}

export default ConnectCalendarModal

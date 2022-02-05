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

interface ConnectCalendarProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (provider: string) => void
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
                onClick={() => onSelect('google')}
                leftIcon={<FaGoogle />}
                variant="outline"
              >
                Google
              </Button>
              <Button
                onClick={() => onSelect('iCloud')}
                leftIcon={<FaApple />}
                variant="outline"
                disabled
              >
                iCloud (soon)
              </Button>
              <Button
                onClick={() => onSelect('outlook')}
                leftIcon={<FaMicrosoft />}
                variant="outline"
                disabled
              >
                Outlook (soon)
              </Button>
              <Button
                onClick={() => onSelect('office365')}
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

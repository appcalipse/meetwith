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
}

const ConnectCalendarModal: React.FC<ConnectCalendarProps> = ({
  isOpen,
  onClose,
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
              <Button leftIcon={<FaGoogle />} variant="outline">
                Google
              </Button>
              <Button leftIcon={<FaApple />} variant="outline" disabled>
                iCloud (soon)
              </Button>
              <Button leftIcon={<FaMicrosoft />} variant="outline" disabled>
                Outlook (soon)
              </Button>
              <Button leftIcon={<FaMicrosoft />} variant="outline" disabled>
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

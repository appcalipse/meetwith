import {
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'

interface IProps {
  isOpen: boolean
}

const ConnectWalletDialog: React.FC<IProps> = ({ isOpen }) => {
  return (
    <>
      <Modal
        blockScrollOnMount={false}
        isOpen={isOpen}
        onClose={() => {
          // do nothing
        }}
        closeOnOverlayClick={false}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader data-testid="connection-modal-header">
            Connecting...
          </ModalHeader>
          <ModalBody p={6}>
            <Text color={useColorModeValue('gray.500', 'gray.300')}>
              Connecting your account
            </Text>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  )
}

export default ConnectWalletDialog

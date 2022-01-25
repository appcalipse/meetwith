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
          <ModalHeader>Connecting...</ModalHeader>
          <ModalBody p={6}>
            <Text color={useColorModeValue('gray.500', 'gray.300')}>
              Please connect your wallet to continue
            </Text>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  )
}

export default ConnectWalletDialog

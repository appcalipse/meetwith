import { Modal, ModalContent, ModalOverlay, Spinner } from '@chakra-ui/react'
import React from 'react'

const ModalLoading: React.FC<{ isOpen: boolean }> = props => {
  return (
    <Modal
      isOpen={props.isOpen}
      onClose={() => {}}
      blockScrollOnMount={false}
      size={'lg'}
      isCentered
    >
      <ModalOverlay />
      <ModalContent
        p="6"
        bg={'transparent'}
        boxShadow={0}
        alignItems="center"
        justifyContent="center"
      >
        <Spinner size="xl" />
      </ModalContent>
    </Modal>
  )
}

export default ModalLoading

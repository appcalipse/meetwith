import { Modal, ModalContent, ModalOverlay, Spinner } from '@chakra-ui/react'
import Loading from '@components/Loading/index'
import React from 'react'

const LogoModalLoading: React.FC<{ isOpen: boolean }> = props => {
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
        <Loading label="Scheduling Meeting..." />
      </ModalContent>
    </Modal>
  )
}

export default LogoModalLoading

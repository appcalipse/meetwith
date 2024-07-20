import {
  Button,
  Heading,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack,
} from '@chakra-ui/react'
import React, { FC } from 'react'

interface IDiscoverATimeInfoModal {
  onClose: () => void
  isOpen: boolean
}

const DiscoverATimeInfoModal: FC<IDiscoverATimeInfoModal> = props => {
  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      blockScrollOnMount={false}
      size={'lg'}
      isCentered
    >
      <ModalOverlay />
      <ModalContent p="6">
        <ModalHeader
          p={'0'}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <Heading size={'md'}>Discover a time</Heading>
          <ModalCloseButton />
        </ModalHeader>
        <ModalBody p={'0'} mt={'6'}>
          <VStack>
            <Text size={'base'}>
              Discover available time slots based on other Meet With Wallet
              users&apos; availability.
            </Text>

            <Text size={'base'}>
              You can exclude participants’ availability by marking them as
              &apos;Optional&apos; in Add/Edit Groups.
            </Text>
            <Button
              colorScheme="primary"
              onClick={props.onClose}
              ml={'auto'}
              right={0}
              px={6}
            >
              Ok
            </Button>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default DiscoverATimeInfoModal

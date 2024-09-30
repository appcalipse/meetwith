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
  Text,
  VStack,
} from '@chakra-ui/react'
import React, { FC } from 'react'
interface IGroupAdminLeaveModal {
  onClose: () => void
  isOpen: boolean
}
const GroupAdminChangeModal: FC<IGroupAdminLeaveModal> = props => {
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
          <Heading size={'md'}>Assign admin</Heading>
          <ModalCloseButton />
        </ModalHeader>
        <ModalBody p={'0'} mt={'6'}>
          <VStack>
            <Text size={'base'}>
              Every group requires at least 1 admin. You need to assign an admin
              before you can make yourself a member.
            </Text>
            <Button
              colorScheme="primary"
              onClick={props.onClose}
              ml={'auto'}
              right={0}
            >
              Ok
            </Button>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default GroupAdminChangeModal

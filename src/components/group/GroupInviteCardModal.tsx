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
  useToast,
} from '@chakra-ui/react'
import React from 'react'

import { logEvent } from '@/utils/analytics'
import { rejectGroup } from '@/utils/api_helper'

export interface IGroupInviteCardModal {
  group_id: string
  resetState: () => void
  onClose: () => void
  isOpen: boolean
}

const GroupInviteCardModal: React.FC<IGroupInviteCardModal> = props => {
  const [declining, setDeclining] = React.useState(false)
  const toast = useToast()
  const handleDecline = async () => {
    setDeclining(true)
    try {
      await rejectGroup(props.group_id)
      logEvent('Rejected invite', {
        group_id: props.group_id,
      })
    } catch (error: any) {}
    setDeclining(false)
    props.onClose()
    props.resetState()
  }
  return (
    <Modal
      onClose={props.onClose}
      isOpen={props.isOpen}
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
          <Heading size={'md'}>Decline invite</Heading>
          <ModalCloseButton />
        </ModalHeader>
        <ModalBody p={'0'} mt={'6'}>
          <Text size={'sm'}>
            Are you sure? You cannot undo this action afterwards. However, you
            can always get invited back by an admin.
          </Text>
          <HStack ml={'auto'} w={'fit-content'} mt={'6'} gap={'4'}>
            <Button onClick={props.onClose} colorScheme="neutral">
              Nervermind
            </Button>
            <Button
              isLoading={declining}
              colorScheme="primary"
              onClick={handleDecline}
            >
              Confirm
            </Button>
          </HStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default GroupInviteCardModal

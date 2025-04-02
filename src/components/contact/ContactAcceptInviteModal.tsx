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

export interface IContactAcceptInviteModal {
  group_id: string
  resetState: () => void
  onClose: () => void
  isOpen: boolean
}

const ContactAcceptInviteModal: React.FC<IContactAcceptInviteModal> = props => {
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
      <ModalOverlay backdropFilter="blur(10px)" bg="rgba(0, 0, 0, 0.6)" />

      <ModalContent p="6" bg="neutral.900">
        <ModalHeader
          p={'0'}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <Heading size={'md'}>Decline request</Heading>
          <ModalCloseButton />
        </ModalHeader>
        <ModalBody p={'0'} mt={'6'}>
          <Text size={'sm'}>
            You are about to deny this connection request, this will mean losing
            this connection
          </Text>
          <HStack ml={'auto'} w={'fit-content'} mt={'6'} gap={'4'}>
            <Button onClick={props.onClose} colorScheme="primary">
              Close
            </Button>
            <Button
              isLoading={declining}
              colorScheme="primary"
              variant="outline"
              onClick={handleDecline}
            >
              Decline request
            </Button>
          </HStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default ContactAcceptInviteModal

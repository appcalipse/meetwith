import {
  Box,
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
import React, { useContext } from 'react'

import { ContactStateContext } from '@/providers/ContactInvitesProvider'
import { rejectContactInvite } from '@/utils/api_helper'

export interface IContactRejectInviteModal {
  onClose: () => void
  isOpen: boolean
  syncReject: (contactId: string) => void
}

const ContactRejectInviteModal: React.FC<IContactRejectInviteModal> = props => {
  const [declining, setDeclining] = React.useState(false)
  const { selectedContact } = useContext(ContactStateContext)
  const toast = useToast()
  const handleDecline = async () => {
    if (!selectedContact) return
    setDeclining(true)
    try {
      await rejectContactInvite(selectedContact.id)
      props.syncReject(selectedContact.id)
      props.onClose()
    } catch (e) {
      const error = e as Error
      console.error(e)
      toast({
        title: 'Error',
        description: error.message || 'Could not remove contact request',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setDeclining(false)
    }
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
      <ModalContent bg="neutral.900">
        <ModalHeader
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          px={6}
          pt={6}
        >
          <Heading size={'md'}>Decline invite</Heading>
          <ModalCloseButton />
        </ModalHeader>
        <ModalBody p={'0'} mt={'2'}>
          <Box px="6" pb="6">
            <Text size={'sm'}>
              Are you sure? You cannot undo this action afterwards. However, you
              can always get invited back by an admin.
            </Text>
          </Box>
          <HStack
            ml={'auto'}
            w={'100%'}
            mt={'6'}
            gap={'4'}
            justifyContent="space-between"
            bg="neutral.825"
            px="6"
            py={4}
          >
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

export default ContactRejectInviteModal

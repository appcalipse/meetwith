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
  VStack,
} from '@chakra-ui/react'
import { Jazzicon } from '@ukstv/jazzicon-react'
import React, { useContext } from 'react'

import { ContactStateContext } from '@/providers/ContactInvitesProvider'
import { acceptContactInvite, rejectContactInvite } from '@/utils/api_helper'
import {
  ContactAlreadyExists,
  ContactInviteNotForAccount,
  ContactInviteNotFound,
  OwnInviteError,
} from '@/utils/errors'

export interface IContactRejectInviteModal {
  onClose: () => void
  isOpen: boolean
  sync: (contactId: string) => void
  refetch: () => void
}

const ContactRejectInviteModal: React.FC<IContactRejectInviteModal> = props => {
  const [declining, setDeclining] = React.useState(false)
  const { selectedContact, fetchRequestCount } = useContext(ContactStateContext)
  const toast = useToast()

  const [isAccepting, setIsAccepting] = React.useState(false)

  const handleDecline = async () => {
    if (!selectedContact) return
    setDeclining(true)
    try {
      await rejectContactInvite(selectedContact.id)
      props.sync(selectedContact.id)
    } catch (e) {
      if (e instanceof ContactAlreadyExists) {
        toast({
          title: 'Error',
          description: e.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
          position: 'top',
        })
      } else if (e instanceof ContactInviteNotForAccount) {
        toast({
          title: 'Error',
          description: "Contact invite already accepted or doesn't exist",
          status: 'error',
          duration: 5000,
          isClosable: true,
          position: 'top',
        })
      } else if (e instanceof ContactInviteNotFound) {
        toast({
          title: 'Error',
          description: e.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
          position: 'top',
        })
      } else if (e instanceof OwnInviteError) {
        toast({
          title: 'Error',
          description: e.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
          position: 'top',
        })
      } else {
        toast({
          title: 'Error',
          description: 'Could not load contact request',
          status: 'error',
          duration: 5000,
          isClosable: true,
          position: 'top',
        })
      }
    } finally {
      setDeclining(false)
      props.onClose()
    }
    fetchRequestCount()
  }
  const handleAccept = async () => {
    if (!selectedContact) return
    setIsAccepting(true)
    try {
      await acceptContactInvite(selectedContact.id)
      props.sync(selectedContact.id)
    } catch (e) {
      if (e instanceof ContactAlreadyExists) {
        toast({
          title: 'Error',
          description: e.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
          position: 'top',
        })
      } else if (e instanceof ContactInviteNotForAccount) {
        toast({
          title: 'Error',
          description: "Contact invite already accepted or doesn't exist",
          status: 'error',
          duration: 5000,
          isClosable: true,
          position: 'top',
        })
      } else if (e instanceof ContactInviteNotFound) {
        toast({
          title: 'Error',
          description: e.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
          position: 'top',
        })
      } else if (e instanceof OwnInviteError) {
        toast({
          title: 'Error',
          description: e.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
          position: 'top',
        })
      } else {
        toast({
          title: 'Error',
          description: 'Could not load contact request',
          status: 'error',
          duration: 5000,
          isClosable: true,
          position: 'top',
        })
      }
      props.refetch()
    } finally {
      setIsAccepting(false)
    }
    props.onClose()
    fetchRequestCount()
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
      <ModalContent
        bg="neutral.900"
        fontWeight={500}
        rounded={12}
        overflow={'hidden'}
      >
        <ModalHeader
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          px={6}
          pt={6}
        >
          <Heading size={'md'}>Decline request</Heading>
          <ModalCloseButton />
        </ModalHeader>
        <ModalBody p={'0'} mt={'2'}>
          <Box px={6} pb={2}>
            <Text size={'sm'}>
              You are about to deny this connection request, this will mean
              losing this connection
            </Text>
            {selectedContact && (
              <HStack w="100%" justifyContent="space-between" mt={6}>
                <VStack alignItems="flex-start" gap={4}>
                  <Text>User</Text>
                  <HStack w="fit-content">
                    <Jazzicon
                      address={selectedContact.address || ''}
                      className="contact-avatar"
                    />
                    <Text maxW={200} isTruncated>
                      {selectedContact.name ||
                        selectedContact.address ||
                        selectedContact.email_address}
                    </Text>
                  </HStack>
                </VStack>
                <VStack alignItems="flex-start" gap={4}>
                  <Text>Alternative</Text>
                  <Button
                    colorScheme="primary"
                    onClick={handleAccept}
                    isLoading={isAccepting}
                  >
                    Accept request
                  </Button>
                </VStack>
              </HStack>
            )}
          </Box>
          <HStack
            ml={'auto'}
            w={'100%'}
            mt={'6'}
            gap={'4'}
            justifyContent="space-between"
            bg="neutral.825"
            px="6"
            borderTop={'1px solid'}
            borderColor="neutral.400"
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

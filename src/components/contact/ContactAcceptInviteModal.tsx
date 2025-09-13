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

import { MetricStateContext } from '@/providers/MetricStateProvider'
import { logEvent } from '@/utils/analytics'
import { acceptContactInvite } from '@/utils/api_helper'
import {
  ContactAlreadyExists,
  ContactInviteNotForAccount,
  ContactInviteNotFound,
  OwnInviteError,
} from '@/utils/errors'
import { ellipsizeAddress } from '@/utils/user_manager'

import { Avatar } from '../profile/components/Avatar'
import { ContactStateContext } from '../profile/Contact'

export interface IContactAcceptInviteModal {
  onClose: () => void
  isOpen: boolean
  sync: (contactId: string) => void
  refetch: () => void
  openRejectModal: () => void
}

const ContactAcceptInviteModal: React.FC<IContactAcceptInviteModal> = props => {
  const [isAccepting, setIsAccepting] = React.useState(false)
  const { fetchContactsRequestCount } = useContext(MetricStateContext)
  const { selectedContact } = useContext(ContactStateContext)

  const toast = useToast()

  const handleAccept = async () => {
    if (!selectedContact) return
    setIsAccepting(true)
    try {
      await acceptContactInvite(selectedContact.id)
      props.sync(selectedContact.id)
      logEvent('accept_contact_invite', {
        address: selectedContact.address,
        name: selectedContact.name,
      })
      toast({
        title: 'Success',
        description: 'Contact request accepted successfully',
        status: 'success',
        duration: 5000,
        isClosable: true,
        position: 'top',
      })
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
      props.onClose()
      fetchContactsRequestCount()
    }
  }
  const handleDecline = async () => {
    props.openRejectModal()
    props.onClose()
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
          <Heading size={'md'}>Accept Invite</Heading>
          <ModalCloseButton />
        </ModalHeader>
        <ModalBody p={'0'} mt={'6'}>
          <Box px={6} pb={2}>
            <Text size={'sm'}>
              You are about to accept this connection request.
            </Text>
            <Text size={'sm'} color="primary.500">
              Note that accepting this request will grant this user access to be
              able to schedule with you, anytime.
            </Text>
            <HStack mt={4}>
              <Text flex={1}>User</Text>
              <Text flex={1}>Actions</Text>
            </HStack>
          </Box>
          <HStack
            ml={'auto'}
            w={'100%'}
            mt={0}
            gap={'4'}
            justifyContent="space-between"
            bg="neutral.825"
            px="6"
            borderTop={'1px solid'}
            borderColor="neutral.400"
            py={4}
          >
            {selectedContact && (
              <HStack w="fit-content" flex={1}>
                <Box className="contact-avatar">
                  <Avatar
                    avatar_url={selectedContact.avatar_url}
                    address={selectedContact.address || ''}
                    name={
                      selectedContact.name ||
                      ellipsizeAddress(selectedContact.address)
                    }
                  />
                </Box>
                <Text maxW={200} isTruncated>
                  {selectedContact.name ||
                    selectedContact.address ||
                    selectedContact.email_address}
                </Text>
              </HStack>
            )}
            <HStack ml={'auto'} w={'fit-content'} gap={'4'} flex={1}>
              <Button
                onClick={handleAccept}
                isLoading={isAccepting}
                colorScheme="primary"
              >
                Accept
              </Button>
              <Button
                colorScheme="primary"
                variant="outline"
                onClick={handleDecline}
              >
                Decline
              </Button>
            </HStack>
          </HStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default ContactAcceptInviteModal

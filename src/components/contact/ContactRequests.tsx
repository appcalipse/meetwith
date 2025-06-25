import {
  Button,
  HStack,
  Spacer,
  Spinner,
  Table,
  TableContainer,
  Tbody,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react'
import Image from 'next/image'
import { useRouter } from 'next/router'
import React, { ReactNode, useContext, useEffect, useState } from 'react'

import { ContactStateContext } from '@/providers/ContactInvitesProvider'
import { Account } from '@/types/Account'
import { ContactInvite } from '@/types/Contacts'
import { EditMode, Intents } from '@/types/Dashboard'
import {
  getContactInviteById,
  getContactInviteRequests,
} from '@/utils/api_helper'
import { ContactAlreadyExists, ContactInviteNotFound } from '@/utils/errors'

import ContactAcceptInviteModal from './ContactAcceptInviteModal'
import ContactRejectInviteModal from './ContactRejectInviteModal'
import ContactRequestItem from './ContactRequestItem'

type Props = {
  currentAccount: Account | null
  search: string
  reloadContacts: () => void
}

const ContactRequests = ({ currentAccount, search, reloadContacts }: Props) => {
  const [requests, setRequests] = useState<Array<ContactInvite>>([])
  const { setSelectedContact } = useContext(ContactStateContext)
  const { query, push } = useRouter()
  const { intent, identifier } = query as {
    intent: Intents.ACCEPT_CONTACT
    identifier: string
  }
  const [loading, setIsLoading] = useState(true)
  const [noMoreFetch, setNoMoreFetch] = useState(false)
  const {
    isOpen: isRejectOpenModal,
    onOpen: openRejectModal,
    onClose: closeRejectModal,
  } = useDisclosure()
  const {
    isOpen: isAcceptOpenModal,
    onOpen: openAcceptModal,
    onClose: closeAcceptModal,
  } = useDisclosure()

  const [firstFetch, setFirstFetch] = useState(true)
  const toast = useToast()
  const fetchRequests = async (reset?: boolean, limit = 10) => {
    const PAGE_SIZE = limit
    setIsLoading(true)
    const newRequests = await getContactInviteRequests(
      PAGE_SIZE,
      reset ? 0 : requests.length,
      search
    )

    if (newRequests.length < PAGE_SIZE) {
      setNoMoreFetch(true)
    }
    setRequests((reset ? [] : [...requests]).concat(newRequests))
    setIsLoading(false)
  }
  const resetState = async () => {
    setFirstFetch(true)
    setNoMoreFetch(false)
    await fetchRequests(true)
    setFirstFetch(false)
  }

  useEffect(() => {
    void resetState()
  }, [currentAccount?.address, search])
  let content: ReactNode
  const handleLoadContactInvite = async () => {
    try {
      const contact = await getContactInviteById(identifier)
      setSelectedContact(contact)
      if (intent === Intents.ACCEPT_CONTACT) {
        openAcceptModal()
      }
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
      } else if (e instanceof ContactInviteNotFound) {
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
    }
  }
  useEffect(() => {
    if (identifier && intent) {
      handleLoadContactInvite()
    }
  }, [intent, identifier])
  if (firstFetch) {
    content = (
      <Tbody>
        <Tr color="white">
          <Th colSpan={6}>
            <VStack alignItems="center" mb={8}>
              <Image
                src="/assets/schedule.svg"
                height={200}
                width={200}
                alt="Loading..."
              />
              <HStack pt={8}>
                <Spinner />
                <Text fontSize="lg">Checking your contact requests...</Text>
              </HStack>
            </VStack>
          </Th>
        </Tr>
      </Tbody>
    )
  } else if (requests.length === 0) {
    content = (
      <Tbody>
        <Tr color="white">
          <Th justifyContent="center" colSpan={6}>
            <Text textAlign="center" w="100%" mx="auto" py={4}>
              You have no contact request
            </Text>
          </Th>
        </Tr>
      </Tbody>
    )
  } else {
    content = (
      <Tbody>
        {requests?.map((account, index) => (
          <ContactRequestItem
            account={account}
            key={`contact-request-${account.address}`}
            refetch={() => fetchRequests(true, requests.length + 1)}
            syncAccept={() => {
              setRequests(requests.filter(r => r.address !== account.address))
              reloadContacts()
            }}
            index={index}
            openRejectModal={openRejectModal}
          />
        ))}
        {!noMoreFetch && !firstFetch && (
          <Tr color="white">
            <Th justifyContent="center" colSpan={6}>
              <VStack mb={8}>
                <Button
                  isLoading={loading}
                  colorScheme="primary"
                  variant="outline"
                  alignSelf="center"
                  my={4}
                  onClick={() => fetchRequests()}
                >
                  Load more
                </Button>
                <Spacer />
              </VStack>
            </Th>
          </Tr>
        )}
      </Tbody>
    )
  }

  return (
    <TableContainer>
      <ContactRejectInviteModal
        isOpen={isRejectOpenModal}
        onClose={() => {
          closeRejectModal()
          push(`/dashboard/${EditMode.CONTACTS}`)
        }}
        sync={id => {
          setRequests(requests.filter(r => r.id !== id))
          reloadContacts()
        }}
        refetch={() => fetchRequests(true, requests.length + 1)}
      />
      <ContactAcceptInviteModal
        isOpen={isAcceptOpenModal}
        onClose={() => {
          closeAcceptModal()
          push(`/dashboard/${EditMode.CONTACTS}`)
        }}
        sync={id => {
          setRequests(requests.filter(r => r.id !== id))
          reloadContacts()
        }}
        refetch={() => fetchRequests(true, requests.length + 1)}
        openRejectModal={openRejectModal}
      />
      <Table variant="unstyled" colorScheme="whiteAlpha">
        <Thead bg="neutral.900">
          <Tr color="white">
            <Th>User</Th>
            <Th>Description</Th>
            <Th>Account ID</Th>
            <Th>Action</Th>
          </Tr>
        </Thead>
        {content}
      </Table>
    </TableContainer>
  )
}

export default ContactRequests

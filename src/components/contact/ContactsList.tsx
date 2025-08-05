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
  VStack,
} from '@chakra-ui/react'
import Image from 'next/image'
import React, {
  forwardRef,
  ReactNode,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react'

import { Account } from '@/types/Account'
import { Contact } from '@/types/Contacts'
import { getContacts } from '@/utils/api_helper'

import ContactListItem from './ContactListItem'

type Props = {
  currentAccount: Account | null
  search: string
}
export interface ContactLisRef {
  reloadContacts: () => void
}

const ContactsList = forwardRef<ContactLisRef, Props>(
  ({ currentAccount, search }: Props, ref) => {
    const [contacts, setContacts] = useState<Array<Contact>>([])
    const [loading, setIsLoading] = useState(true)
    const [noMoreFetch, setNoMoreFetch] = useState(false)
    const [firstFetch, setFirstFetch] = useState(true)
    const fetchContacts = async (reset?: boolean, limit = 10) => {
      const PAGE_SIZE = limit
      setIsLoading(true)
      const newContacts = await getContacts(
        PAGE_SIZE,
        reset ? 0 : contacts.length,
        search
      )

      if (newContacts.length < PAGE_SIZE) {
        setNoMoreFetch(true)
      }
      setContacts((reset ? [] : [...contacts]).concat(newContacts))
      setIsLoading(false)
    }

    const resetState = async () => {
      setFirstFetch(true)
      setNoMoreFetch(false)
      await fetchContacts(true)
      setFirstFetch(false)
    }

    useImperativeHandle(ref, () => ({
      reloadContacts: () => fetchContacts(true, contacts.length + 2),
    }))

    useEffect(() => {
      void resetState()
    }, [currentAccount?.address, search])

    let content: ReactNode

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
                  <Text fontSize="lg">Checking your contacts...</Text>
                </HStack>
              </VStack>
            </Th>
          </Tr>
        </Tbody>
      )
    } else if (contacts.length === 0) {
      content = (
        <Tbody>
          <Tr color="white">
            <Th justifyContent="center" colSpan={6}>
              <Text textAlign="center" w="100%" mx="auto" py={4}>
                You have no contacts
              </Text>
            </Th>
          </Tr>
        </Tbody>
      )
    } else {
      content = (
        <Tbody>
          {contacts?.map((account, index) => (
            <ContactListItem
              account={account}
              key={`contact-${account.address}`}
              index={index}
              sync={(id: string) =>
                setContacts(contacts.filter(r => r.id !== id))
              }
              refetch={() => fetchContacts(true, contacts.length + 1)}
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
                    onClick={() => fetchContacts()}
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
        <Table variant="unstyled" colorScheme="whiteAlpha">
          <Thead bg="neutral.900">
            <Tr color="white">
              <Th>User</Th>
              <Th>Description</Th>
              <Th>Account ID</Th>
              <Th>Schedule</Th>
              <Th>Action</Th>
            </Tr>
          </Thead>
          {content}
        </Table>
      </TableContainer>
    )
  }
)

ContactsList.displayName = 'ContactsList'

export default ContactsList

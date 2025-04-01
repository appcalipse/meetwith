import {
  Badge,
  Box,
  Button,
  Flex,
  FormLabel,
  Heading,
  HStack,
  Input,
  Spacer,
  Spinner,
  Tab,
  Table,
  TableContainer,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tbody,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure,
  VStack,
} from '@chakra-ui/react'
import Image from 'next/image'
import React, { ReactNode, useContext, useEffect, useState } from 'react'
import { FaPlus } from 'react-icons/fa'
import { RiSearch2Line } from 'react-icons/ri'

import { useDebounceValue } from '@/hooks/useDebounceValue'
import { ContactStateContext } from '@/providers/ContactInvitesProvider'
import { Account } from '@/types/Account'
import { type Contact, ContactInvite } from '@/types/Contacts'
import { getContactInviteRequests, getContacts } from '@/utils/api_helper'

import ContactListItem from '../contact/ContactListItem'
import ContactRequestItem from '../contact/ContactRequestItem'
import ContactSearchModal from '../contact/ContactSearchModal'

const Contact: React.FC<{ currentAccount: Account }> = ({ currentAccount }) => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [debouncedValue, setValue] = useDebounceValue('', 500)
  const [contacts, setContacts] = useState<Array<Contact>>([])
  const [loading, setIsLoading] = useState(true)
  const [noMoreFetch, setNoMoreFetch] = useState(false)
  const [noMoreFetchRequests, setNoMoreFetchRequests] = useState(false)
  const [loadingRequests, setIsLoadingRequests] = useState(true)
  const { requestCount } = useContext(ContactStateContext)
  const [firstFetch, setFirstFetch] = useState(true)
  const [requests, setRequests] = useState<Array<ContactInvite>>([])
  const fetchContacts = async (reset?: boolean) => {
    const PAGE_SIZE = 10
    setIsLoading(true)
    const newContacts = await getContacts(
      PAGE_SIZE,
      reset ? 0 : contacts.length,
      debouncedValue
    )

    if (newContacts.length < PAGE_SIZE) {
      setNoMoreFetch(true)
    }
    setContacts((reset ? [] : [...contacts]).concat(newContacts))
    setIsLoading(false)
  }
  const fetchRequests = async (reset?: boolean, limit = 10) => {
    const PAGE_SIZE = limit
    setIsLoadingRequests(true)
    const newRequests = await getContactInviteRequests(
      PAGE_SIZE,
      reset ? 0 : requests.length
    )
    if (newRequests.length < PAGE_SIZE) {
      setNoMoreFetchRequests(true)
    }
    setRequests((reset ? [] : [...requests]).concat(newRequests))
  }
  const resetState = async () => {
    setFirstFetch(true)
    setNoMoreFetch(false)
    await fetchContacts(true)
    await fetchRequests(true)
    setFirstFetch(false)
  }

  useEffect(() => {
    void resetState()
  }, [currentAccount?.address, debouncedValue])
  let contactContent: ReactNode
  let requestContent: ReactNode

  if (firstFetch) {
    contactContent = (
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
    contactContent = (
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
    contactContent = (
      <Tbody>
        {contacts?.map((account, index) => (
          <ContactListItem
            account={account}
            key={account.address}
            index={index}
          />
        ))}
        <Tr color="white">
          <Th justifyContent="center" colSpan={6}>
            <VStack mb={8}>
              {!noMoreFetch && !firstFetch && (
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
              )}
              <Spacer />
            </VStack>
          </Th>
        </Tr>
      </Tbody>
    )
  }

  if (firstFetch) {
    requestContent = (
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
    requestContent = (
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
    requestContent = (
      <Tbody>
        {requests?.map((account, index) => (
          <ContactRequestItem
            account={account}
            key={account.account_owner_address}
            refetch={() => fetchRequests(false, requests.length + 1)}
            syncAccept={() =>
              setRequests(
                requests.filter(
                  r => r.account_owner_address !== account.account_owner_address
                )
              )
            }
            index={index}
          />
        ))}
        <Tr color="white">
          <Th justifyContent="center" colSpan={6}>
            <VStack mb={8}>
              {!noMoreFetchRequests && !firstFetch && (
                <Button
                  isLoading={loadingRequests}
                  colorScheme="primary"
                  variant="outline"
                  alignSelf="center"
                  my={4}
                  onClick={() => fetchRequests()}
                >
                  Load more
                </Button>
              )}
              <Spacer />
            </VStack>
          </Th>
        </Tr>
      </Tbody>
    )
  }
  return (
    <Flex direction={'column'} maxWidth="100%">
      <ContactSearchModal isOpen={isOpen} onClose={onClose} />
      <HStack
        justifyContent="space-between"
        alignItems="flex-start"
        mb={4}
        gap={6}
      >
        <Heading fontSize="2xl">
          My Contact
          <Text fontSize="sm" fontWeight={500} mt={1} lineHeight={1.5}>
            A contact is an entity or person you regularly would want to
            schedule with so you add them to your list
          </Text>
        </Heading>
      </HStack>

      <Tabs variant="unstyled" bg="neutral.900">
        <HStack justifyContent="space-between" mb={4} p={5}>
          <Box w="fit-content" pos="relative" h="fit-content">
            <FormLabel
              display="flex"
              htmlFor="search"
              pos="absolute"
              left={2}
              insetY={0}
              h="full"
              justifyContent="center"
              alignItems="center"
            >
              <RiSearch2Line color="#7B8794" />
            </FormLabel>
            <Input
              pl={8}
              w="fit-content"
              placeholder="Search contact"
              id="search"
              defaultValue={debouncedValue}
              onChange={e => setValue(e.target.value)}
            />
          </Box>

          <TabList
            w="auto"
            bg="neutral.850"
            p={1}
            borderWidth={1}
            borderColor="neutral.400"
            rounded={1.5}
          >
            <Tab
              rounded={4}
              fontWeight={700}
              _selected={{
                color: 'neutral.900',
                bg: 'primary.200',
              }}
            >
              Contact list
            </Tab>
            <Tab
              rounded={4}
              fontWeight={700}
              _selected={{
                color: 'neutral.900',
                bg: 'primary.200',
              }}
            >
              Requests received
              {requestCount > 0 && (
                <Badge
                  colorScheme="primary"
                  color="neutral.900"
                  bg="primary.200"
                  ml={2}
                  px={1.5}
                >
                  {requestCount}
                </Badge>
              )}
            </Tab>
          </TabList>
          <Button
            onClick={onOpen}
            flexShrink={0}
            colorScheme="primary"
            display={{ base: 'none', md: 'flex' }}
            mt={{ base: 4, md: 0 }}
            mb={4}
            leftIcon={<FaPlus />}
          >
            Add new contact
          </Button>
        </HStack>
        <TableContainer>
          <TabPanels>
            <TabPanel p={0}>
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
                {contactContent}
              </Table>
            </TabPanel>
            <TabPanel p={0}>
              <Table variant="unstyled" colorScheme="whiteAlpha">
                <Thead bg="neutral.900">
                  <Tr color="white">
                    <Th>User</Th>
                    <Th>Description</Th>
                    <Th>Account ID</Th>
                    <Th>Action</Th>
                  </Tr>
                </Thead>
                {requestContent}
              </Table>
            </TabPanel>
          </TabPanels>
        </TableContainer>
      </Tabs>
    </Flex>
  )
}

export default Contact

import {
  Box,
  HStack,
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
import { InfiniteData, useInfiniteQuery } from '@tanstack/react-query'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { ReactNode, useContext, useEffect, useRef } from 'react'

import { Account } from '@/types/Account'
import { ContactInvite } from '@/types/Contacts'
import { EditMode, Intents } from '@/types/Dashboard'
import {
  getContactInviteById,
  getContactInviteRequests,
} from '@/utils/api_helper'
import { ContactAlreadyExists, ContactInviteNotFound } from '@/utils/errors'
import QueryKeys from '@/utils/query_keys'
import { queryClient } from '@/utils/react_query'

import { ContactStateContext } from '../profile/Contact'
import ContactAcceptInviteModal from './ContactAcceptInviteModal'
import ContactRejectInviteModal from './ContactRejectInviteModal'
import ContactRequestItem from './ContactRequestItem'

type Props = {
  currentAccount: Account | null
  search: string
  reloadContacts: () => void
}

const PAGE_SIZE = 10

const ContactRequests = ({ currentAccount, search, reloadContacts }: Props) => {
  const { setSelectedContact } = useContext(ContactStateContext)
  const { query, push } = useRouter()
  const { intent, identifier } = query as {
    intent: Intents.ACCEPT_CONTACT
    identifier: string
  }
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

  const toast = useToast()
  const loadMoreRef = useRef<HTMLTableRowElement | null>(null)

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: QueryKeys.contactRequests(currentAccount?.address, search),
    queryFn: async ({ pageParam: offset = 0 }) => {
      const requests = await getContactInviteRequests(PAGE_SIZE, offset, search)

      return {
        requests,
        nextOffset: offset + requests.length,
        hasMore: requests.length >= PAGE_SIZE,
      }
    },
    getNextPageParam: lastPage =>
      lastPage.hasMore ? lastPage.nextOffset : undefined,
    enabled: !!currentAccount?.address,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  })

  const requests = data?.pages.flatMap(page => page.requests) ?? []

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) return

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          void fetchNextPage()
        }
      },
      {
        root: null,
        rootMargin: '200px',
        threshold: 0.1,
      }
    )

    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])
  const handleSyncRequest = (id: string) => {
    // Optimistically remove from UI
    queryClient.setQueryData<
      InfiniteData<{
        requests: ContactInvite[]
        nextOffset: number
        hasMore: boolean
      }>
    >(QueryKeys.contactRequests(currentAccount?.address, search), old => {
      if (!old) return old
      return {
        ...old,
        pages: old.pages.map(page => ({
          ...page,
          requests: page.requests.filter((r: ContactInvite) => r.id !== id),
        })),
      }
    })
    reloadContacts()
  }

  const handleRefetch = async () => {
    await queryClient.invalidateQueries({
      queryKey: QueryKeys.contactRequests(currentAccount?.address, search),
    })
  }

  let content: ReactNode
  const handleLoadContactInvite = async () => {
    try {
      const contact = await getContactInviteById(identifier)
      setSelectedContact(contact)
      if (intent === Intents.ACCEPT_CONTACT) {
        openAcceptModal()
      } else if (intent === Intents.DECLINE_CONTACT) {
        openRejectModal()
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
      void handleLoadContactInvite()
    }
  }, [intent, identifier])

  if (isLoading) {
    content = (
      <Tbody>
        <Tr color="text-primary">
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
  } else if (isError) {
    content = (
      <Tbody>
        <Tr color="text-primary">
          <Th colSpan={6}>
            <Text textAlign="center" w="100%" mx="auto" py={4} color="red.500">
              Failed to load contact requests. Please try again.
            </Text>
          </Th>
        </Tr>
      </Tbody>
    )
  } else if (requests.length === 0) {
    content = (
      <Tbody>
        <Tr color="text-primary">
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
            refetch={handleRefetch}
            syncAccept={reloadContacts}
            index={index}
            openRejectModal={openRejectModal}
          />
        ))}
        {hasNextPage && (
          <Tr ref={loadMoreRef} color="text-primary">
            <Th justifyContent="center" colSpan={6}>
              <Box
                w="100%"
                h="20px"
                display="flex"
                justifyContent="center"
                alignItems="center"
                my={4}
              >
                {isFetchingNextPage && (
                  <Spinner size="md" color="primary.500" />
                )}
              </Box>
            </Th>
          </Tr>
        )}
        {!hasNextPage && requests.length > 0 && (
          <Tr color="text-primary">
            <Th justifyContent="center" colSpan={6}>
              <Text color="gray.500" fontSize="sm" textAlign="center" my={4}>
                No more requests to load
              </Text>
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
          void push(`/dashboard/${EditMode.CONTACTS}`)
        }}
        sync={handleSyncRequest}
        refetch={handleRefetch}
      />
      <ContactAcceptInviteModal
        isOpen={isAcceptOpenModal}
        onClose={() => {
          closeAcceptModal()
          void push(`/dashboard/${EditMode.CONTACTS}`)
        }}
        sync={handleSyncRequest}
        refetch={handleRefetch}
        openRejectModal={openRejectModal}
      />
      <Table variant="unstyled" colorScheme="whiteAlpha">
        <Thead bg="bg-surface">
          <Tr color="text-primary">
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

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
  VStack,
} from '@chakra-ui/react'
import { InfiniteData, useInfiniteQuery } from '@tanstack/react-query'
import Image from 'next/image'
import {
  forwardRef,
  ReactNode,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'

import { Account } from '@/types/Account'
import { Contact } from '@/types/Contacts'
import { getContacts } from '@/utils/api_helper'
import QueryKeys from '@/utils/query_keys'
import { queryClient } from '@/utils/react_query'

import ContactListItem from './ContactListItem'

type Props = {
  currentAccount: Account | null
  search: string
  hasProAccess?: boolean
}
export interface ContactLisRef {
  reloadContacts: () => void
}

const PAGE_SIZE = 10

const ContactsList = forwardRef<ContactLisRef, Props>(
  ({ currentAccount, search, hasProAccess = true }: Props, ref) => {
    const loadMoreRef = useRef<HTMLTableRowElement | null>(null)

    const {
      data,
      fetchNextPage,
      hasNextPage,
      isFetchingNextPage,
      isLoading,
      isError,
    } = useInfiniteQuery({
      queryKey: QueryKeys.contacts(currentAccount?.address, search),
      queryFn: async ({ pageParam: offset = 0 }) => {
        const contacts = await getContacts(PAGE_SIZE, offset, search)

        return {
          contacts,
          nextOffset: offset + contacts.length,
          hasMore: contacts.length >= PAGE_SIZE,
        }
      },
      getNextPageParam: lastPage =>
        lastPage.hasMore ? lastPage.nextOffset : undefined,
      enabled: !!currentAccount?.address,
      refetchOnWindowFocus: true,
      staleTime: 30_000,
    })

    const contacts = data?.pages.flatMap(page => page.contacts) ?? []

    useImperativeHandle(ref, () => ({
      reloadContacts: async () => {
        await queryClient.invalidateQueries({
          queryKey: QueryKeys.contacts(currentAccount?.address, search),
        })
      },
    }))

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

    const handleContactSync = (id: string) => {
      // Optimistically update UI
      queryClient.setQueryData<
        InfiniteData<{
          contacts: Contact[]
          nextOffset: number
          hasMore: boolean
        }>
      >(QueryKeys.contacts(currentAccount?.address, search), old => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            contacts: page.contacts.filter((c: Contact) => c.id !== id),
          })),
        }
      })
    }

    const handleRefetch = async () => {
      await queryClient.invalidateQueries({
        queryKey: QueryKeys.contacts(currentAccount?.address, search),
      })
    }

    let content: ReactNode

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
                  <Text fontSize="lg">Checking your contacts...</Text>
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
              <Text
                textAlign="center"
                w="100%"
                mx="auto"
                py={4}
                color="red.500"
              >
                Failed to load contacts. Please try again.
              </Text>
            </Th>
          </Tr>
        </Tbody>
      )
    } else if (contacts.length === 0) {
      content = (
        <Tbody>
          <Tr color="text-primary">
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
              sync={handleContactSync}
              refetch={handleRefetch}
              hasProAccess={hasProAccess}
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
          {!hasNextPage && contacts.length > 0 && (
            <Tr color="text-primary">
              <Th justifyContent="center" colSpan={6}>
                <Text color="gray.500" fontSize="sm" textAlign="center" my={4}>
                  No more contacts to load
                </Text>
              </Th>
            </Tr>
          )}
        </Tbody>
      )
    }

    return (
      <TableContainer>
        <Table variant="unstyled" colorScheme="whiteAlpha">
          <Thead bg="bg-surface">
            <Tr color="text-primary">
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

import { SearchIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  FormLabel,
  Heading,
  HStack,
  Input,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
} from '@chakra-ui/react'
import { useMutation } from '@tanstack/react-query'
import React, { useEffect, useState } from 'react'
import { FaPlus } from 'react-icons/fa'

import { useDebounceValue } from '@/hooks/useDebounceValue'
import { LeanContact } from '@/types/Contacts'
import { getContactsLean } from '@/utils/api_helper'

import GroupContactModalItem from './GroupContactModalItem'

type Props = {
  isOpen: boolean
  onClose: () => void
  isContactAlreadyAdded: (address: LeanContact) => boolean
  addUserFromContact: (address: LeanContact) => void | Promise<void>
  removeUserFromContact: (address: LeanContact) => void | Promise<void>
  title?: string
  buttonLabel?: string
  loadingStates?: Map<string, boolean>
}

const GroupContactModal = ({
  title = 'Invite Group Members',
  buttonLabel = 'Add to Group',
  loadingStates = new Map<string, boolean>(),
  ...props
}: Props) => {
  const [debouncedValue, setValue] = useDebounceValue('', 500)
  const [result, setResult] = React.useState<Array<LeanContact>>([])
  const [noMoreFetch, setNoMoreFetch] = useState(false)
  const PAGE_SIZE = 10
  const { isLoading, mutateAsync, reset } = useMutation({
    mutationFn: (data: { query: string; offset?: number }) =>
      getContactsLean(PAGE_SIZE, data?.offset, data?.query?.toLowerCase()),
  })
  const [isMoreLoading, setMoreLoading] = React.useState(false)

  useEffect(() => {
    setNoMoreFetch(false)
    if (!debouncedValue || debouncedValue.length === 0) {
      setResult([])
      reset()
    } else {
      handleSearch()
    }
    ;() => {
      reset()
    }
  }, [debouncedValue])
  useEffect(() => {
    handleSearch()
  }, [])
  const handleSearch = async (reset = true) => {
    const search = await mutateAsync({
      query: debouncedValue,
      offset: reset ? 0 : result?.length,
    })
    if (search.length < PAGE_SIZE) {
      setNoMoreFetch(true)
    }
    setResult(search || [])
  }
  const handleLoadMore = async () => {
    setMoreLoading(true)
    const data = await getContactsLean(
      PAGE_SIZE,
      result?.length,
      debouncedValue
    )
    if (data.length < PAGE_SIZE) {
      setNoMoreFetch(true)
    }
    setResult(result?.concat(data))
    setMoreLoading(false)
  }
  return (
    <Modal
      onClose={props.onClose}
      isOpen={props.isOpen}
      blockScrollOnMount={false}
      size={'2xl'}
    >
      <ModalOverlay backdropFilter="blur(10px)" bg="rgba(0, 0, 0, 0.6)" />
      <ModalContent p={0} bg="bg-surface" rounded={12}>
        <ModalHeader
          pt={10}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          px={10}
        >
          <Heading size={'md'}>{title}</Heading>
          <ModalCloseButton />
        </ModalHeader>
        <ModalBody
          pb={result.length > 0 ? 0 : 10}
          px={0}
          gap={2}
          display="flex"
          flexDirection="column"
        >
          <Box px={10} pos="relative" h="fit-content">
            <FormLabel
              display="flex"
              htmlFor="search"
              pos="absolute"
              left={14}
              insetY={0}
              h="full"
              justifyContent="center"
              alignItems="center"
            >
              <SearchIcon alignSelf="center" color="neutral.400" />
            </FormLabel>
            <Input
              pl={10}
              w="100%"
              placeholder="Search contact"
              id="search"
              defaultValue={debouncedValue}
              onChange={e => setValue(e.target.value)}
            />
          </Box>

          {isLoading ? (
            <HStack alignItems="center" justifyContent="center" py={10}>
              <Spinner
                thickness="4px"
                speed="0.65s"
                emptyColor="primary.100"
                color="primary.700"
                size="xl"
              />
            </HStack>
          ) : result?.length > 0 ? (
            <TableContainer>
              <Table variant="unstyled" colorScheme="whiteAlpha">
                <Thead bg="bg-surface">
                  <Tr color="text-primary">
                    <Th colSpan={4}>User</Th>
                    <Th
                      colSpan={4}
                      display={{ base: 'none', md: 'table-cell' }}
                    >
                      Account ID
                    </Th>
                    <Th colSpan={1}>Action</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {result.map((account, index) => (
                    <GroupContactModalItem
                      key={`${account.id}-contact-${index}`}
                      index={index}
                      isContactAlreadyAdded={props.isContactAlreadyAdded}
                      addUserFromContact={props.addUserFromContact}
                      removeUserFromContact={props.removeUserFromContact}
                      buttonLabel={buttonLabel}
                      isLoading={!!loadingStates.get(account.id)}
                      {...account}
                    />
                  ))}
                  {!noMoreFetch && (
                    <Tr color="white">
                      <Td justifyContent="center" colSpan={9}>
                        <HStack justifyItems="center">
                          <Button
                            isLoading={isMoreLoading}
                            colorScheme="primary"
                            variant="outline"
                            my={4}
                            onClick={handleLoadMore}
                            mx="auto"
                          >
                            Load more
                          </Button>
                        </HStack>
                      </Td>
                    </Tr>
                  )}
                </Tbody>
              </Table>
            </TableContainer>
          ) : (
            <VStack alignItems="center" justifyContent="center" p={10}>
              <Text color="text-secondary" mb={4} textAlign="center">
                You haven’t added any contacts yet. Add people to your contacts
                to easily invite them to groups and meetings.
              </Text>
              <Button
                flexShrink={0}
                as={Link}
                href="/dashboard/contacts?action=add&source=group-modal"
                colorScheme="primary"
                leftIcon={<FaPlus />}
                _hover={{ textDecoration: 'none' }}
              >
                Add new contact
              </Button>
            </VStack>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
export default GroupContactModal

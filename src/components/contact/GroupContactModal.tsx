import { SearchIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  FormLabel,
  Heading,
  HStack,
  Input,
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
} from '@chakra-ui/react'
import { useMutation } from '@tanstack/react-query'
import { Jazzicon } from '@ukstv/jazzicon-react'
import React, { useEffect, useState } from 'react'

import { useDebounceValue } from '@/hooks/useDebounceValue'
import { LeanContact } from '@/types/Contacts'
import { getContactsLean } from '@/utils/api_helper'
import { ellipsizeAddress } from '@/utils/user_manager'
// TODO: Add coupon countdown
type Props = {
  isOpen: boolean
  onClose: () => void
  isContactAlreadyAdded: (address: LeanContact) => boolean
  addUserFromContact: (address: LeanContact) => void
  removeUserFromContact: (address: LeanContact) => void
}

const GroupContactModal = (props: Props) => {
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
    // TODO: Write sql function on supabase to handle this search

    setResult(search)
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
      <ModalContent p={0} bg="neutral.900" rounded={12}>
        <ModalHeader
          pt={10}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          px={10}
        >
          <Heading size={'md'}>Invite group members</Heading>
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
          ) : (
            result?.length > 0 && (
              <TableContainer>
                <Table variant="unstyled" colorScheme="whiteAlpha">
                  <Thead bg="neutral.900">
                    <Tr color="white">
                      <Th colSpan={4}>User</Th>
                      <Th colSpan={4}>Account ID</Th>
                      <Th colSpan={1}>Action</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {result.map((account, index) => (
                      <Tr
                        key={index}
                        bg={index % 2 === 0 ? 'neutral.825' : 'none'}
                      >
                        <Td colSpan={4}>
                          <HStack>
                            <Jazzicon
                              address={account.address || ''}
                              className="contact-avatar"
                            />
                            <Text maxW={200} isTruncated>
                              {account.name || account.address}
                            </Text>
                          </HStack>
                        </Td>
                        <Td colSpan={4}>
                          <Text maxW={200} isTruncated>
                            {ellipsizeAddress(account.address)}
                          </Text>
                        </Td>
                        <Td>
                          {props.isContactAlreadyAdded(account) ? (
                            <Button
                              colorScheme="primary"
                              onClick={() =>
                                props.removeUserFromContact(account)
                              }
                              variant="outline"
                            >
                              Remove
                            </Button>
                          ) : (
                            <Button
                              colorScheme="primary"
                              onClick={() => props.addUserFromContact(account)}
                            >
                              Add to group
                            </Button>
                          )}
                        </Td>
                      </Tr>
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
            )
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
export default GroupContactModal

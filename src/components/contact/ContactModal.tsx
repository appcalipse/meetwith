import { SearchIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  FormLabel,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
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
import React, { useEffect } from 'react'

import { useDebounceValue } from '@/hooks/useDebounceValue'
import { ContactSearch } from '@/types/Contacts'
import { searchForAccounts, sendContactListInvite } from '@/utils/api_helper'
import { isValidEmail } from '@/utils/validations'

type Props = {
  isOpen: boolean
  onClose: () => void
}

const ContactModal = (props: Props) => {
  const [debouncedValue, setValue] = useDebounceValue('', 500)
  const [result, setResult] = React.useState<ContactSearch | null>(null)
  const { isLoading, mutateAsync, reset } = useMutation({
    mutationFn: (data: { query: string; offset?: number }) =>
      searchForAccounts(data?.query, data?.offset),
  })
  const { isLoading: isInviteLoading, mutateAsync: sendInviteAsync } =
    useMutation({
      mutationFn: (data: { email?: string; address?: string }) =>
        sendContactListInvite(data?.address, data?.email),
    })

  const [pendingForIndex, setPendingForIndex] = React.useState<number | null>(
    null
  )
  const [isMoreLoading, setMoreLoading] = React.useState(false)
  useEffect(() => {
    if (!debouncedValue || debouncedValue.length === 0) {
      setResult(null)
      setPendingForIndex(null)
      reset()
    } else {
      handleSearch()
    }
    ;() => {
      reset()
    }
  }, [debouncedValue])
  const handleSearch = async (reset = true) => {
    const search = await mutateAsync({
      query: debouncedValue,
      offset: reset ? 0 : result?.result?.length,
    })
    if (isValidEmail(debouncedValue) && search.result === null) {
      setResult({
        total_count: 1,
        result: [
          {
            email: debouncedValue,
            address: '',
            name: '',
          },
        ],
      })
    } else {
      setResult(search)
    }
    setPendingForIndex(null)
  }
  const handleLoadMore = async () => {
    setMoreLoading(true)
    const data = await searchForAccounts(debouncedValue, result?.result?.length)
    setResult({
      total_count: data.total_count,
      result: result?.result?.concat(data?.result || []),
    })
    setMoreLoading(false)
  }
  return (
    <Modal
      onClose={props.onClose}
      isOpen={props.isOpen}
      blockScrollOnMount={false}
      size={'lg'}
    >
      <ModalOverlay backdropFilter="blur(10px)" bg="rgba(0, 0, 0, 0.6)" />
      <ModalContent p={0} bg="neutral.900" rounded={12}>
        <ModalBody
          pt={10}
          pb={result?.result && result.result.length > 0 ? 0 : 10}
          px={0}
          gap={2}
          display="flex"
          flexDirection="column"
        >
          <ModalCloseButton />
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
              placeholder="Search with email or wallet address"
              id="search"
              defaultValue={debouncedValue}
              onChange={e => setValue(e.target.value)}
            />
          </Box>
          {debouncedValue && (
            <>
              <Text px={10}>
                <b>Search results for</b> {debouncedValue}
              </Text>
              <Box px={10}>
                {isLoading ? (
                  <HStack alignItems="center" justifyContent="center" pb={10}>
                    <Spinner
                      thickness="4px"
                      speed="0.65s"
                      emptyColor="primary.100"
                      color="primary.700"
                      size="xl"
                    />
                  </HStack>
                ) : result?.result === null ? (
                  <Text fontWeight={500} color="primary.300" fontSize="small">
                    No account found for &quot;{debouncedValue}&ldquo;.
                  </Text>
                ) : (
                  <Text fontWeight={500} color="primary.300" fontSize="small">
                    {result?.total_count} found accounts found for term &quot;
                    {debouncedValue}&ldquo;
                  </Text>
                )}
              </Box>
            </>
          )}
          {!isLoading && result?.result && (
            <TableContainer>
              <Table variant="unstyled" colorScheme="whiteAlpha">
                <Thead bg="neutral.900">
                  <Tr color="white">
                    <Th colSpan={4}>User</Th>
                    <Th colSpan={1}>Action</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {result.result.map((account, index) => (
                    <Tr
                      key={index}
                      bg={index % 2 === 0 ? 'neutral.825' : 'none'}
                    >
                      <Td colSpan={4}>
                        <HStack>
                          <Jazzicon
                            address={account.address}
                            className="contact-avatar"
                          />
                          <Text maxW={200} isTruncated>
                            {account.name || account.address || account.email}
                          </Text>
                        </HStack>
                      </Td>
                      <Td>
                        <Button
                          colorScheme="primary"
                          isLoading={
                            pendingForIndex === index && isInviteLoading
                          }
                          disabled={isInviteLoading}
                          onClick={() => {
                            setPendingForIndex(index)
                            sendInviteAsync({
                              email: account.email,
                              address: account.address,
                            })
                          }}
                        >
                          Send request
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                  {result.total_count > result?.result?.length && (
                    <Tr color="white">
                      <Td justifyContent="center" colSpan={5}>
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
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
export default ContactModal

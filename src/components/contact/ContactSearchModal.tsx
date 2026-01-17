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
import { useRouter } from 'next/router'
import React, { useEffect } from 'react'

import { useDebounceValue } from '@/hooks/useDebounceValue'
import { ContactSearch } from '@/types/Contacts'
import { searchForAccounts } from '@/utils/api_helper'

import ContactSearchItem from './ContactSearchItem'

type Props = {
  isOpen: boolean
  onClose: () => void
  canAddContact?: boolean
}

const ContactSearchModal = (props: Props) => {
  const { canAddContact = true } = props
  const [debouncedValue, setValue] = useDebounceValue('', 500)
  const [result, setResult] = React.useState<ContactSearch | null>(null)

  const action = useRouter().query.action as string
  const { isLoading, mutateAsync, reset } = useMutation({
    mutationFn: (data: { query: string; offset?: number }) =>
      searchForAccounts(data?.query?.toLowerCase(), data?.offset),
  })

  const [isMoreLoading, setMoreLoading] = React.useState(false)

  useEffect(() => {
    if (!debouncedValue || debouncedValue.length === 0) {
      setResult(null)
      reset()
    } else {
      void handleSearch()
    }
    ;() => {
      void reset()
    }
  }, [debouncedValue])
  const handleSearch = async (reset = true) => {
    const search = await mutateAsync({
      query: debouncedValue.trim().toLowerCase(),
      offset: reset ? 0 : result?.result?.length,
    })

    setResult(search)
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
      size={{
        lg: 'lg',
        md: 'xl',
        base: '2xl',
      }}
    >
      <ModalOverlay backdropFilter="blur(10px)" bg="rgba(0, 0, 0, 0.6)" />
      <ModalContent p={0} bg="bg-surface" rounded={12}>
        {action && (
          <ModalHeader
            pt={10}
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            px={10}
          >
            <Heading size={'md'}>Add new Contact</Heading>
            <ModalCloseButton />
          </ModalHeader>
        )}
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
                    <ContactSearchItem
                      key={`contact-invite-${
                        account.address || account.email
                      }-${index}`}
                      index={index}
                      {...account}
                      canAddContact={canAddContact}
                      handleUpdateResult={() => {
                        const updatedResult = result
                        if (updatedResult?.result) {
                          updatedResult.result[index].is_invited = true
                          setResult(updatedResult)
                        }
                      }}
                    />
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
export default ContactSearchModal

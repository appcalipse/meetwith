import { Search2Icon, SearchIcon } from '@chakra-ui/icons'
import {
  Badge,
  Box,
  Button,
  Flex,
  FormLabel,
  Heading,
  HStack,
  Input,
  Tab,
  Table,
  TableCaption,
  TableContainer,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tbody,
  Td,
  Text,
  Tfoot,
  Th,
  Thead,
  Tr,
  useDisclosure,
} from '@chakra-ui/react'
import React from 'react'
import { FaPlus } from 'react-icons/fa'

import { Account } from '@/types/Account'

import ContactModal from '../contact/ContactModal'

const Contact: React.FC<{ currentAccount: Account }> = ({ currentAccount }) => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  return (
    <Flex direction={'column'} maxWidth="100%">
      <ContactModal isOpen={isOpen} onClose={onClose} />
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
              <SearchIcon alignSelf="center" color="neutral.400" />
            </FormLabel>
            <Input
              pl={8}
              w="fit-content"
              placeholder="Search contact"
              id="search"
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
              <Badge
                colorScheme="primary"
                color="neutral.900"
                bg="primary.200"
                ml={2}
                px={1.5}
              >
                2
              </Badge>
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
            <TabPanel>
              <Table variant="unstyled" colorScheme="whiteAlpha">
                <Thead bg="neutral.900">
                  <Tr color="white">
                    <Th>User</Th>
                    <Th>Description</Th>
                    <Th>Account ID</Th>
                    <Th>Email address</Th>
                    <Th>Schedule</Th>
                    <Th>Action</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  <Tr color="white">
                    <Th justifyContent="center" colSpan={6}>
                      <Text textAlign="center" w="100%" mx="auto">
                        No Contacts
                      </Text>
                    </Th>
                  </Tr>
                </Tbody>
              </Table>
            </TabPanel>
            <TabPanel>
              <Table variant="unstyled" colorScheme="whiteAlpha">
                <Thead bg="neutral.900">
                  <Tr color="white">
                    <Th>User</Th>
                    <Th>Description</Th>
                    <Th>Account ID</Th>
                    <Th>Email address</Th>
                    <Th>Schedule</Th>
                    <Th>Action</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  <Tr color="white">
                    <Th justifyContent="center" colSpan={6}>
                      <Text textAlign="center" w="100%" mx="auto">
                        No Contacts
                      </Text>
                    </Th>
                  </Tr>
                </Tbody>
              </Table>
            </TabPanel>
          </TabPanels>
        </TableContainer>
      </Tabs>
    </Flex>
  )
}

export default Contact

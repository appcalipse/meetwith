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
  TableContainer,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useDisclosure,
} from '@chakra-ui/react'
import React, { useContext, useRef } from 'react'
import { FaPlus } from 'react-icons/fa'
import { RiSearch2Line } from 'react-icons/ri'

import { useDebounceValue } from '@/hooks/useDebounceValue'
import { ContactStateContext } from '@/providers/ContactInvitesProvider'
import { Account } from '@/types/Account'

import ContactRequests from '../contact/ContactRequests'
import ContactSearchModal from '../contact/ContactSearchModal'
import ContactsList, { ContactLisRef } from '../contact/ContactsList'

const Contact: React.FC<{ currentAccount: Account }> = ({ currentAccount }) => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const { requestCount } = useContext(ContactStateContext)
  const contactListRef = useRef<ContactLisRef>(null)
  const [debouncedValue, setValue] = useDebounceValue('', 500)

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
              <ContactsList
                currentAccount={currentAccount}
                search={debouncedValue}
                ref={contactListRef}
              />
            </TabPanel>
            <TabPanel p={0}>
              <ContactRequests
                currentAccount={currentAccount}
                search={debouncedValue}
                reloadContacts={() => contactListRef.current?.reloadContacts()}
              />
            </TabPanel>
          </TabPanels>
        </TableContainer>
      </Tabs>
    </Flex>
  )
}

export default Contact

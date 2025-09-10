import {
  Badge,
  Box,
  Button,
  Flex,
  FormLabel,
  Heading,
  HStack,
  Input,
  Link,
  Tab,
  TableContainer,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useDisclosure,
  VStack,
} from '@chakra-ui/react'
import ConnectCalendarModal from '@components/ConnectedCalendars/ConnectCalendarModal'
import { useRouter } from 'next/router'
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { FaPlus } from 'react-icons/fa'
import { RiSearch2Line } from 'react-icons/ri'

import { useDebounceValue } from '@/hooks/useDebounceValue'
import { MetricStateContext } from '@/providers/MetricStateProvider'
import { OnboardingContext } from '@/providers/OnboardingProvider'
import { Account } from '@/types/Account'
import { ContactInvite } from '@/types/Contacts'

import ContactRequests from '../contact/ContactRequests'
import ContactSearchModal from '../contact/ContactSearchModal'
import ContactsList, { ContactLisRef } from '../contact/ContactsList'

interface IContactStateContext {
  selectedContact: ContactInvite | null
  setSelectedContact: (contact: ContactInvite) => void
}

const DEFAULT_STATE: IContactStateContext = {
  selectedContact: null,
  setSelectedContact: () => {},
}

export const ContactStateContext =
  React.createContext<IContactStateContext>(DEFAULT_STATE)

const Contact: React.FC<{ currentAccount: Account }> = ({ currentAccount }) => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const {
    isOpen: isCalendarConnectionOpen,
    onOpen: OpenCalendarConnection,
    onClose: closeCalendarConnection,
  } = useDisclosure()
  const { asPath } = useRouter()
  const { contactsRequestCount } = useContext(MetricStateContext)
  const contactListRef = useRef<ContactLisRef>(null)
  const [debouncedValue, setValue] = useDebounceValue('', 500)
  const [calendarsConnected, setCalendarsConnected] = useState(true)
  const onboardingContext = useContext(OnboardingContext)
  const [selectedContact, setSelectedContact] =
    React.useState<ContactInvite | null>(null)
  async function defineCalendarsConnected() {
    setCalendarsConnected(await onboardingContext.connectedCalendarsComplete())
  }
  useEffect(() => {
    void defineCalendarsConnected()
  }, [currentAccount])
  const state = useMemo(
    () =>
      Buffer.from(
        JSON.stringify({
          redirectTo: asPath,
          ignoreState: true,
        })
      ).toString('base64'),
    []
  )
  const context = {
    selectedContact,
    setSelectedContact,
  }
  return (
    <ContactStateContext.Provider value={context}>
      <Flex direction={'column'} maxWidth="100%">
        <ContactSearchModal isOpen={isOpen} onClose={onClose} />
        <ConnectCalendarModal
          isOpen={isCalendarConnectionOpen}
          onClose={closeCalendarConnection}
          state={state}
        />
        <HStack
          justifyContent="space-between"
          alignItems="flex-start"
          mb={4}
          gap={6}
        >
          <Heading fontSize="2xl">
            My Contacts
            <Text fontSize="sm" fontWeight={500} mt={1} lineHeight={1.5}>
              A contact is an entity or person you regularly would want to
              schedule with so you add them to your list
            </Text>
          </Heading>
        </HStack>

        <Tabs
          variant="unstyled"
          bg="bg-surface"
          borderRadius={15}
          mb={10}
          pb={0}
        >
          <VStack w={'100%'} p={5}>
            <HStack
              justifyContent="space-between"
              mb={4}
              w={'100%'}
              alignItems="flex-start"
              flexDirection={{
                base: 'column-reverse',
                md: 'row',
              }}
            >
              <Box
                w={{ base: '100%', md: 'fit-content' }}
                pos="relative"
                h="100%"
              >
                <FormLabel
                  display="flex"
                  htmlFor="search"
                  pos="absolute"
                  left={3}
                  insetY={0}
                  h="100%"
                  justifyContent="center"
                  alignItems="center"
                >
                  <RiSearch2Line color="neutral.400" />
                </FormLabel>
                <Input
                  pl={10}
                  w={{ base: '100%', md: 'fit-content' }}
                  h={12}
                  type="search"
                  placeholder="Search contact"
                  id="search"
                  defaultValue={debouncedValue}
                  rounded={6}
                  onChange={e => setValue(e.target.value)}
                  autoComplete="off"
                  _placeholder={{
                    color: 'neutral.400',
                  }}
                />
              </Box>
              <Button
                onClick={onOpen}
                flexShrink={0}
                colorScheme="primary"
                display={{ base: 'flex', md: 'none' }}
                mt={{ base: 4, md: 0 }}
                mb={4}
                leftIcon={<FaPlus />}
                w={'100%'}
              >
                Add new contact
              </Button>
              <TabList
                w={{ base: '100%', md: 'auto' }}
                bg="bg-surface-secondary"
                p={1}
                borderWidth={1}
                rounded={6}
              >
                <Tab
                  rounded={4}
                  flexGrow={{
                    base: 1,
                    md: 0,
                  }}
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
                  flexGrow={{
                    base: 1,
                    md: 0,
                  }}
                  fontWeight={700}
                  _selected={{
                    color: 'neutral.900',
                    bg: 'primary.200',
                  }}
                >
                  Requests received
                  {contactsRequestCount > 0 && (
                    <Badge
                      colorScheme="primary"
                      color="white"
                      bg="primary.600"
                      ml={2}
                      px={1.5}
                    >
                      {contactsRequestCount}
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
            {!calendarsConnected && (
              <Text w={'100%'}>
                Your calendar is not connected, this is preventing your contact
                from scheduling with you.{' '}
                <Box
                  as={'span'}
                  color={'primary.200'}
                  onClick={() => OpenCalendarConnection()}
                  fontWeight={700}
                  cursor="pointer"
                  _hover={{
                    textDecoration: 'underline',
                  }}
                >
                  Please connect your calendar.
                </Box>
              </Text>
            )}
          </VStack>
          <TableContainer>
            <TabPanels p={0}>
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
                  reloadContacts={() =>
                    contactListRef.current?.reloadContacts()
                  }
                />
              </TabPanel>
            </TabPanels>
          </TableContainer>
        </Tabs>
      </Flex>
    </ContactStateContext.Provider>
  )
}

export default Contact

import {
  AccordionButton,
  AccordionItem,
  AccordionPanel,
  Box,
  Button,
  Heading,
  HStack,
  IconButton,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import Link from 'next/link'
import React, { FC, useId, useState } from 'react'
import { FaChevronDown, FaChevronUp, FaPlus } from 'react-icons/fa'

import SearchInput from '@/components/ui/SearchInput'
import { Account } from '@/types/Account'
import { LeanContact } from '@/types/Contacts'

import ContactMemberItem from './ContactMemberItem'

export interface IContactsCard {
  currentAccount?: Account | null
  contacts: Array<LeanContact>
}

const ContactsCard: FC<IContactsCard> = props => {
  const id = useId()
  const borderColor = useColorModeValue('neutral.200', 'neutral.600')
  const [search, setSearch] = useState('')
  const members = props.contacts.filter(
    member =>
      member.name?.toLowerCase().includes(search.toLowerCase()) ||
      member.address?.toLowerCase().includes(search.toLowerCase())
  )
  return (
    <AccordionItem
      width="100%"
      key={`${id}-${props.contacts.length}`}
      my={3}
      borderColor="text-subtle"
      borderWidth={1}
      borderRadius="0.375rem"
      id={props.contacts.length.toString()}
    >
      {({ isExpanded }) => (
        <>
          <AccordionButton
            color={isExpanded ? 'text-primary' : 'text-subtle'}
            cursor="pointer"
            justifyContent="space-between"
            py={5}
            height={10}
            fontSize="16"
            px={isExpanded ? 6 : 4}
          >
            <Text
              fontSize={isExpanded ? 'lg' : 'base'}
              fontWeight={isExpanded ? 700 : 500}
              lineHeight={'120%'}
              transition="all 0.2s"
              transitionTimingFunction={'isExpanded ? ease-in : ease-out'}
            >
              Select member
            </Text>
            <IconButton
              width="fit-content"
              m={0}
              aria-label="Expand Group"
              p={0}
              bg={'transparent'}
              _hover={{
                bg: 'transparent',
              }}
              minW={'auto'}
              icon={
                isExpanded ? (
                  <FaChevronUp size={20} />
                ) : (
                  <FaChevronDown size={20} />
                )
              }
            />
          </AccordionButton>
          <AccordionPanel px={0} pb={0}>
            <VStack my={0} width="100%" px={0} alignItems="flex-start">
              <Box px={6}>
                <SearchInput
                  setValue={setSearch}
                  value={search}
                  placeholder="Search for person in contacts"
                />
              </Box>
              <HStack
                width="100%"
                justifyContent="space-between"
                pb={2}
                borderBottomWidth={1}
                borderBottomColor={borderColor}
                py={3}
                px={6}
              >
                <Heading size="sm" flexBasis="57%" fontWeight={800}>
                  User
                </Heading>
                <Heading size="sm" flexBasis="43%" fontWeight={800}>
                  Action
                </Heading>
              </HStack>
              {members.length > 0 ? (
                members.map(member => (
                  <ContactMemberItem
                    key={member.address}
                    currentAccount={props.currentAccount!}
                    {...member}
                  />
                ))
              ) : (
                <VStack alignItems="center" justifyContent="center" p={10}>
                  <Text color="text-secondary" mb={4} textAlign="center">
                    You haven’t added any contacts yet. Add people to your
                    contacts to easily invite them to groups and meetings.
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
            </VStack>
          </AccordionPanel>
        </>
      )}
    </AccordionItem>
  )
}

export default ContactsCard

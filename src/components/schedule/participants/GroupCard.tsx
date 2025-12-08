import {
  AccordionButton,
  AccordionItem,
  AccordionPanel,
  Badge,
  Box,
  Heading,
  HStack,
  IconButton,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import React, { FC, useEffect, useId, useState } from 'react'
import { FaChevronDown, FaChevronUp } from 'react-icons/fa'

import SearchInput from '@/components/ui/SearchInput'
import { Account } from '@/types/Account'
import { GetGroupsFullResponse } from '@/types/Group'

import GroupParticipantsItem from './GroupParticipantsItem'

export interface IGroupCard extends GetGroupsFullResponse {
  currentAccount?: Account | null
  currentGroupId?: string
  globalSearch?: string
}

const GroupCard: FC<IGroupCard> = props => {
  const id = useId()
  const borderColor = useColorModeValue('neutral.200', 'neutral.600')
  const [search, setSearch] = useState(props.globalSearch || '')
  const members = props.members.filter(
    member =>
      member.displayName?.toLowerCase().includes(search.toLowerCase()) ||
      member.address?.toLowerCase().includes(search.toLowerCase()) ||
      member.domain?.toLowerCase().includes(search.toLowerCase())
  )
  useEffect(() => {
    setSearch(props.globalSearch || '')
  }, [props.globalSearch])
  return (
    <AccordionItem
      width="100%"
      key={`${id}-${props.id}`}
      my={3}
      borderColor="text-subtle"
      borderWidth={1}
      borderRadius="0.375rem"
      id={props.id}
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
            gap={2}
          >
            <Text
              fontSize={isExpanded ? 'lg' : 'base'}
              fontWeight={isExpanded ? 700 : 500}
              lineHeight={'120%'}
              transition="all 0.2s"
              textAlign="left"
              transitionTimingFunction={'isExpanded ? ease-in : ease-out'}
            >
              {props.name}
            </Text>
            <HStack gap={2}>
              {props.currentGroupId === props.id && (
                <Badge
                  color="white"
                  bg="border-default"
                  px={1.5}
                  rounded="8px"
                  fontSize={'10px'}
                  py={1}
                >
                  Current Group
                </Badge>
              )}
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
            </HStack>
          </AccordionButton>

          <AccordionPanel
            px={0}
            pb={0}
            key={`collapse-${props.id}-${isExpanded}`}
          >
            <VStack my={0} width="100%" px={0} alignItems="flex-start">
              <Box px={6} mt={2} width="100%">
                <SearchInput
                  setValue={setSearch}
                  value={search}
                  placeholder="Search from group"
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
                  <GroupParticipantsItem
                    key={member.address + `-${props.id}-${id}`}
                    currentAccount={props.currentAccount!}
                    groupId={props.id}
                    groupName={props.name}
                    address={member?.address || ''}
                    {...member}
                  />
                ))
              ) : (
                <VStack width="100%" alignItems="center" my={6}>
                  <Text px={6} py={4} color="neutral.400">
                    No members found.
                  </Text>
                </VStack>
              )}
            </VStack>
          </AccordionPanel>
        </>
      )}
    </AccordionItem>
  )
}

export default GroupCard

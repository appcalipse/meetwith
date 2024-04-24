import {
  Accordion,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Image,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Spacer,
  Spinner,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import React, { ReactNode, useEffect, useState } from 'react'
import { FaCaretDown, FaPlus, FaSearch } from 'react-icons/fa'

import { Account } from '@/types/Account'
import { GetGroupsResponse } from '@/types/Group'
import { getGroups, getGroupsEmpty } from '@/utils/api_helper'

import GroupCard from '../group/GroupCard'

export interface GroupProps {
  prop?: string
}

const Group: React.FC<{ currentAccount: Account }> = ({ currentAccount }) => {
  const [groups, setGroups] = useState<Array<GetGroupsResponse>>([])
  const [loading, setLoading] = useState(true)
  const [noMoreFetch, setNoMoreFetch] = useState(false)
  const [firstFetch, setFirstFetch] = useState(true)
  const { invite } = useRouter().query
  const fetchGroups = async (reset?: boolean) => {
    const PAGE_SIZE = 5
    setLoading(true)
    const newGroups = await getGroups(PAGE_SIZE, groups.length)
    if (newGroups.length < PAGE_SIZE) {
      setNoMoreFetch(true)
    }
    setGroups(prev => (reset ? [] : [...prev]).concat(newGroups))
    setLoading(false)
    setFirstFetch(false)
  }
  const resetState = async () => {
    setFirstFetch(true)
    setNoMoreFetch(false)
    fetchGroups(true)
  }

  useEffect(() => {
    resetState()
  }, [currentAccount?.address])
  useEffect(() => {
    // Add modal logic here
  }, [invite])
  let content: ReactNode
  if (firstFetch) {
    content = (
      <VStack alignItems="center" mb={6}>
        <Image src="/assets/schedule.svg" height="200px" alt="Loading..." />
        <HStack pt={8}>
          <Spinner />
          <Text fontSize="lg">Checking for your groups...</Text>
        </HStack>
      </VStack>
    )
  } else if (groups.length === 0) {
    content = (
      <VStack alignItems="center" mt={6} gap={4}>
        <Image src="/assets/no_group.svg" height="200px" alt="Loading..." />
        <Text fontSize="lg">
          You will see your Groups here once you created a new Group.
        </Text>
        <Button
          onClick={() => {
            // Add Creation modal logic here
          }}
          flexShrink={0}
          colorScheme="primary"
          display={{ base: 'none', md: 'flex' }}
          mt={{ base: 4, md: 0 }}
          mb={4}
          leftIcon={<FaPlus />}
        >
          Create new group
        </Button>
      </VStack>
    )
  } else {
    content = (
      <VStack my={6}>
        <Accordion allowMultiple width="100%">
          {groups.map(group => (
            <GroupCard
              key={group.id}
              currentAccount={currentAccount}
              {...group}
            />
          ))}
        </Accordion>
        {!noMoreFetch && !firstFetch && (
          <Button
            isLoading={loading}
            colorScheme="primary"
            variant="outline"
            alignSelf="center"
            my={4}
            onClick={() => fetchGroups()}
          >
            Load more
          </Button>
        )}
        <Spacer />
      </VStack>
    )
  }
  return (
    <Flex direction={'column'} maxWidth="100%">
      <HStack
        justifyContent="space-between"
        alignItems="flex-start"
        mb={4}
        gap={6}
      >
        <Heading fontSize="2xl">
          My Groups
          <Text fontSize="sm" fontWeight={500} mt={1} lineHeight={1.5}>
            A group allows you to add multiple members and schedule meetings by
            automatically finding a suitable time based on each member’s
            availability.
          </Text>
        </Heading>
        <Button
          onClick={() => router.push('/dashboard/create-group')}
          flexShrink={0}
          colorScheme="primary"
          display={{ base: 'none', md: 'flex' }}
          mt={{ base: 4, md: 0 }}
          mb={4}
          leftIcon={<FaPlus />}
        >
          Create new group
        </Button>
      </HStack>
      {content}
    </Flex>
  )
}

export default Group

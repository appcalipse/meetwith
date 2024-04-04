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
import React, { ReactNode, useEffect, useState } from 'react'
import { FaCaretDown, FaPlus, FaSearch } from 'react-icons/fa'

import { Account } from '@/types/Account'
import { GetGroupsResponse } from '@/types/Group'
import { getGroups } from '@/utils/api_helper'

import GroupCard from '../group/GroupCard'

export interface GroupProps {
  prop?: string
}

const Group: React.FC<{ currentAccount: Account }> = ({ currentAccount }) => {
  const [groups, setGroups] = useState<Array<GetGroupsResponse>>([])
  const [loading, setLoading] = useState(true)
  const [noMoreFetch, setNoMoreFetch] = useState(false)
  const [firstFetch, setFirstFetch] = useState(true)
  const bgColor = useColorModeValue('white', '#1F2933')
  const fetchMeetings = async (reset?: boolean) => {
    const PAGE_SIZE = 5
    setLoading(true)
    const newGroups = (await getGroups(
      PAGE_SIZE,
      groups.length
    )) as Array<GetGroupsResponse>
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
    fetchMeetings(true)
  }

  useEffect(() => {
    resetState()
  }, [currentAccount?.address])
  let content: ReactNode
  if (firstFetch) {
    content = (
      <VStack alignItems="center" mb={8}>
        <Image src="/assets/schedule.svg" height="200px" alt="Loading..." />
        <HStack pt={8}>
          <Spinner />
          <Text fontSize="lg">Checking for your groups...</Text>
        </HStack>
      </VStack>
    )
  } else if (groups.length === 0) {
    content = (
      <VStack alignItems="center" mt={8} gap={4}>
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
      <VStack mb={8}>
        <Accordion
          allowMultiple
          bgColor={bgColor}
          width="100%"
          borderRadius="lg"
        >
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
            onClick={() => fetchMeetings()}
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
          My Meetings
          <Text fontSize="sm" fontWeight={500} mt={1} lineHeight={1.5}>
            A group allows you to add multiple members and schedule meetings by
            automatically finding a suitable time based on each member’s
            availability.
          </Text>
        </Heading>
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
      </HStack>
      <HStack justifyContent="space-between" mt={2}>
        <HStack>
          <Button>Filters</Button>
          <Menu>
            <MenuButton as={Button} rightIcon={<FaCaretDown />}>
              Sort
            </MenuButton>
            <MenuList>
              <MenuItem>Ascending</MenuItem>
              <MenuItem>Descending</MenuItem>
            </MenuList>
          </Menu>
        </HStack>
        <Box width="300px" position="relative">
          <Input
            type="text"
            placeholder="Search"
            borderColor={useColorModeValue('gray.300', 'whiteAlpha.300')}
            paddingRight={45}
          />
          <Box
            background="none"
            position="absolute"
            right={5}
            borderRadius={10}
            color={useColorModeValue('gray.300', 'whiteAlpha.300')}
            insetY={0}
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <FaSearch />
          </Box>
        </Box>
      </HStack>
      {content}
    </Flex>
  )
}

export default Group

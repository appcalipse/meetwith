import {
  Accordion,
  Button,
  Flex,
  Heading,
  HStack,
  Image,
  Spacer,
  Spinner,
  Text,
  useDisclosure,
  VStack,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import React, { ReactNode, useEffect, useState } from 'react'
import { FaPlus } from 'react-icons/fa'

import GroupInviteCard from '@/components/group/GroupInviteCard'
import GroupJoinModal from '@/components/group/GroupJoinModal'
import ModalLoading from '@/components/Loading/ModalLoading'
import { Account } from '@/types/Account'
import { GetGroupsResponse, Group as GroupResponse } from '@/types/Group'
import { getGroup, getGroups } from '@/utils/api_helper'

import GroupCard from '../group/GroupCard'
import InviteModal from '../group/InviteModal'

const Group: React.FC<{ currentAccount: Account }> = ({ currentAccount }) => {
  const [groups, setGroups] = useState<Array<GetGroupsResponse>>([])
  const [loading, setLoading] = useState(true)
  const [noMoreFetch, setNoMoreFetch] = useState(false)
  const [firstFetch, setFirstFetch] = useState(true)
  const [inviteGroupData, setInviteGroupData] = useState<
    GroupResponse | undefined
  >(undefined)
  const [inviteDataIsLoading, setInviteDataIsLoading] = useState(false)
  const router = useRouter()
  const { join } = useRouter().query

  const { isOpen, onOpen, onClose } = useDisclosure()
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [selectedGroupName, setSelectedGroupName] = useState<string>('')

  const fetchGroups = async (reset?: boolean) => {
    const PAGE_SIZE = 5
    setLoading(true)
    const newGroups = await getGroups(PAGE_SIZE, reset ? 0 : groups.length)
    if (newGroups?.length < PAGE_SIZE) {
      setNoMoreFetch(true)
    }
    setGroups(prev => (reset ? [] : [...prev]).concat(newGroups))
    setLoading(false)
    setFirstFetch(false)
  }

  const resetState = async () => {
    setFirstFetch(true)
    setNoMoreFetch(false)
    void fetchGroups(true)
  }

  const fetchGroup = async (group_id: string) => {
    setInviteDataIsLoading(true)
    const group = await getGroup(group_id)
    setInviteGroupData(group)
    setInviteDataIsLoading(false)
  }

  useEffect(() => {
    void resetState()
  }, [currentAccount?.address])

  useEffect(() => {
    if (join) {
      void fetchGroup(join as string)
    }
  }, [join])

  const handleAddNewMember = (groupId: string, groupName: string) => {
    setSelectedGroupId(groupId)
    setSelectedGroupName(groupName)
    onOpen()
  }

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
      </VStack>
    )
  } else {
    content = (
      <VStack my={6}>
        <ModalLoading isOpen={inviteDataIsLoading} />
        <GroupJoinModal
          group={inviteGroupData}
          onClose={() => setInviteGroupData(undefined)}
          resetState={resetState}
        />
        <Accordion allowMultiple width="100%">
          {groups.map(group =>
            group?.invitePending ? (
              <GroupInviteCard
                key={group.id}
                {...group}
                resetState={resetState}
              />
            ) : (
              <GroupCard
                key={group.id}
                currentAccount={currentAccount}
                {...group}
                onAddNewMember={handleAddNewMember}
                mt={0}
              />
            )
          )}
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
      <InviteModal
        groupName={selectedGroupName}
        isOpen={isOpen}
        onClose={onClose}
        groupId={selectedGroupId ?? ''}
      />
    </Flex>
  )
}

export default Group

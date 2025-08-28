import { HStack, Image, Spinner, Text, VStack } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import React from 'react'

import { Account } from '@/types/Account'
import { getGroupsInvites } from '@/utils/api_helper'

import GroupInviteCard from './GroupInviteCard'

type Props = {
  currentAccount: Account
  search: string
  reloadGroups: () => void
}

const GroupInvites = ({ currentAccount, search, reloadGroups }: Props) => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['groupInvites', currentAccount?.address, search],
    queryFn: () => {
      return getGroupsInvites(search)
    },
    enabled: !!currentAccount?.address,
    staleTime: 0,
    refetchOnMount: true,
  })
  const groups = data ?? []
  const firstFetch = isLoading

  if (firstFetch) {
    return (
      <VStack alignItems="center" mb={6}>
        <Image src="/assets/schedule.svg" height="200px" alt="Loading..." />
        <HStack pt={8}>
          <Spinner />
          <Text fontSize="lg">Checking for your groups...</Text>
        </HStack>
      </VStack>
    )
  } else if (groups.length === 0) {
    return (
      <VStack alignItems="center" gap={4}>
        <Image src="/assets/no_group.svg" height="200px" alt="Loading..." />
        <Text fontSize="lg">
          No group invitations yet. You&apos;ll see pending invites here when
          someone adds you to a group.
        </Text>
      </VStack>
    )
  } else {
    return (
      <VStack>
        {groups.map(group => (
          <GroupInviteCard
            key={group.id}
            {...group}
            resetState={() => Promise.all([refetch(), reloadGroups()])}
          />
        ))}
      </VStack>
    )
  }
}

export default GroupInvites

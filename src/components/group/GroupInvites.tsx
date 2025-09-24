import { HStack, Image, Spinner, Text, VStack } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import React, { forwardRef, useContext, useImperativeHandle } from 'react'

import { MetricStateContext } from '@/providers/MetricStateProvider'
import { Account } from '@/types/Account'
import { getGroupsInvites } from '@/utils/api_helper'

import GroupInviteCard from './GroupInviteCard'

type Props = {
  currentAccount: Account
  search: string
  reloadGroups: () => Promise<void> | undefined
}
export interface GroupInvitesRef {
  resetState: () => Promise<void>
}
const GroupInvites = forwardRef<GroupInvitesRef, Props>(
  ({ currentAccount, search, reloadGroups }: Props, ref) => {
    const { fetchGroupInvitesCount } = useContext(MetricStateContext)
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
    useImperativeHandle(ref, () => ({
      resetState: async () => {
        await refetch()
      },
    }))
    if (isLoading) {
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
        <VStack gap={2}>
          {groups.map(group => (
            <GroupInviteCard
              key={group.id}
              {...group}
              resetState={() =>
                Promise.all([
                  refetch(),
                  reloadGroups(),
                  fetchGroupInvitesCount(),
                ])
              }
            />
          ))}
        </VStack>
      )
    }
  }
)
GroupInvites.displayName = 'GroupInvites'
export default GroupInvites

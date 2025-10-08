import {
  Box,
  Button,
  Heading,
  HStack,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import React, { FC, useCallback, useMemo } from 'react'

import { Avatar } from '@/components/profile/components/Avatar'
import { useParticipants } from '@/providers/schedule/ParticipantsContext'
import { Account } from '@/types/Account'
import { GroupMember } from '@/types/Group'
import { isGroupParticipant } from '@/types/schedule'
import { getMergedParticipants } from '@/utils/schedule.helper'
import { ellipsizeAddress } from '@/utils/user_manager'

interface IGroupParticipantsItem extends GroupMember {
  currentAccount?: Account | null
  groupId: string
  groupName: string
  address: string
}

const GroupParticipantsItem: FC<IGroupParticipantsItem> = props => {
  const borderColor = useColorModeValue('neutral.200', 'neutral.600')
  const {
    groupParticipants,
    groupAvailability,
    setGroupAvailability,
    setGroupParticipants,
    addGroup,
    removeGroup,
    participants,
    groups: allGroups,
  } = useParticipants()
  const allGroupParticipants = groupParticipants[props.groupId] || []
  const allGroupAvailability = groupAvailability[props.groupId] || []

  const participantAddressesSet = useMemo(() => {
    return new Set(
      getMergedParticipants(participants, allGroups, groupParticipants)
        .map(user => user.account_address)
        .filter(Boolean)
    )
  }, [participants, allGroups, groupParticipants])

  const isMemberAlreadyAdded = useCallback(() => {
    return participantAddressesSet.has(props.address)
  }, [participantAddressesSet])
  const groups = useMemo(
    () =>
      participants.filter(val => {
        return isGroupParticipant(val)
      }),
    [participants]
  )
  const handleParticipantsChange = () => {
    const newParticipants = allGroupParticipants.includes(props.address)
      ? allGroupParticipants.filter(val => val !== props.address)
      : [...allGroupParticipants, props.address]
    if (newParticipants.length === 0) {
      removeGroup(props.groupId)
    } else if (!groups.some(group => group.id === props.groupId)) {
      addGroup({
        id: props.groupId,
        name: props.displayName || '',
        isGroup: true,
      })
    }
    setGroupParticipants(prev => {
      if (newParticipants.length === 0) {
        const newGroupParticipants = { ...prev }
        delete newGroupParticipants[props.groupId]
        return newGroupParticipants
      } else {
        return {
          ...prev,
          [props.groupId]: newParticipants,
        }
      }
    })
    const filteredAvailability = allGroupAvailability.filter(
      val => val !== props.address
    )

    setGroupAvailability(prev => ({
      ...prev,
      [props.groupId]: allGroupParticipants.includes(props.address)
        ? filteredAvailability
        : [...filteredAvailability, props.address],
    }))
  }
  return (
    <HStack
      width="100%"
      justifyContent="space-between"
      borderBottomWidth={1}
      borderBottomColor={borderColor}
      pb={3}
      px={6}
    >
      <HStack flexBasis="57%" overflow="hidden">
        <Box
          width={{ base: '24px', md: '30px', lg: '36px' }}
          height={{ base: '24px', md: '30px', lg: '36px' }}
          display="block"
          flexBasis={{ base: '24px', md: '30px', lg: '36px' }}
        >
          <Avatar
            address={props.address || ''}
            avatar_url={props.avatar_url}
            name={props.displayName}
          />
        </Box>
        <VStack alignItems="start" gap={1} width="calc(100% - 72px)">
          <Heading size={{ base: 'xs', md: 'sm' }}>
            {props.displayName || ellipsizeAddress(props.address || '')}{' '}
            {props.currentAccount?.address === props.address && '(You)'}
          </Heading>
        </VStack>
      </HStack>
      <Box flexBasis="43%">
        <Button
          colorScheme="primary"
          onClick={handleParticipantsChange}
          variant={isMemberAlreadyAdded() ? 'outline' : 'solid'}
        >
          {isMemberAlreadyAdded() ? 'Remove' : 'Add to Meeting'}
        </Button>
      </Box>
    </HStack>
  )
}

export default GroupParticipantsItem

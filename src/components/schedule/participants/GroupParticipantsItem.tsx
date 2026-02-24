import {
  Box,
  Button,
  Heading,
  HStack,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { FC, useCallback, useMemo } from 'react'

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
    setGroupAvailability,
    setGroupParticipants,
    addGroup,
    removeGroup,
    participants,
    groups: allGroups,
  } = useParticipants()
  const allGroupParticipants = groupParticipants[props.groupId] || []

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
  const handleParticipantsRemove = () => {
    const newParticipants = allGroupParticipants.filter(
      val => val !== props.address
    )

    if (newParticipants.length === 0) {
      removeGroup(props.groupId)
    }
    setGroupAvailability(prev => {
      const updated = { ...prev }
      Object.keys(updated).forEach(key => {
        if (updated[key]?.includes(props.address)) {
          updated[key] = updated[key].filter(val => val !== props.address)
        }
      })
      return updated
    })

    setGroupParticipants(prev => {
      const updated = { ...prev }
      Object.keys(updated).forEach(key => {
        if (updated[key]?.includes(props.address)) {
          updated[key] = updated[key].filter(val => val !== props.address)
        }
      })
      return updated
    })
  }
  const handlParticipantAdd = () => {
    const newParticipants = [...allGroupParticipants, props.address]
    if (!groups.some(group => group.id === props.groupId)) {
      addGroup({
        id: props.groupId,
        name: props.displayName || '',
        isGroup: true,
      })
    }

    setGroupParticipants(prev => ({
      ...prev,
      [props.groupId]: newParticipants,
    }))

    setGroupAvailability(prev => ({
      ...prev,
      [props.groupId]: newParticipants,
    }))
  }
  const handleMemberChange = () => {
    if (isMemberAlreadyAdded()) {
      handleParticipantsRemove()
    } else {
      handlParticipantAdd()
    }
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
          onClick={handleMemberChange}
          variant={isMemberAlreadyAdded() ? 'outline' : 'solid'}
        >
          {isMemberAlreadyAdded() ? 'Remove' : 'Add to Meeting'}
        </Button>
      </Box>
    </HStack>
  )
}

export default GroupParticipantsItem

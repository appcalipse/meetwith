import {
  Box,
  Button,
  Heading,
  HStack,
  useColorModeValue,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { FC, useCallback, useMemo } from 'react'

import { Avatar } from '@/components/profile/components/Avatar'
import { useParticipants } from '@/providers/schedule/ParticipantsContext'
import { Account } from '@/types/Account'
import { LeanContact } from '@/types/Contacts'
import {
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '@/types/ParticipantInfo'
import { isGroupParticipant } from '@/types/schedule'
import { NO_GROUP_KEY } from '@/utils/constants/group'
import { getMergedParticipants } from '@/utils/schedule.helper'
import { ellipsizeAddress } from '@/utils/user_manager'

interface IContactMemberItem extends LeanContact {
  currentAccount?: Account | null
  address: string
}

const ContactMemberItem: FC<IContactMemberItem> = props => {
  const borderColor = useColorModeValue('neutral.200', 'neutral.600')
  const {
    setGroupAvailability,
    setGroupParticipants,
    participants,
    setParticipants,
    groups,
    groupParticipants,
    groupAvailability,
  } = useParticipants()
  const participantAddressesSet = useMemo(() => {
    return new Set(
      getMergedParticipants(participants, groups, groupParticipants)
        .map(user => user.account_address)
        .filter(Boolean)
    )
  }, [participants, groups, groupParticipants])

  const isContactAlreadyAdded = useCallback(() => {
    return participantAddressesSet.has(props.address)
  }, [participantAddressesSet])
  const toast = useToast()
  const addUserFromContact = () => {
    if (isContactAlreadyAdded()) {
      toast({
        title: 'User already added',
        description: 'This user has already been added to the invite list.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
        position: 'top',
      })
      return
    }

    const newUser: ParticipantInfo = {
      type: ParticipantType.Invitee,
      account_address: props.address,
      name: props.name || '',
      status: ParticipationStatus.Pending,
      slot_id: '',
      meeting_id: '',
    }
    setParticipants(prev => [...prev, newUser])
    setGroupParticipants(prev => ({
      ...prev,
      [NO_GROUP_KEY]: [...(prev[NO_GROUP_KEY] || []), props.address],
    }))
    setGroupAvailability(prev => ({
      ...prev,
      [NO_GROUP_KEY]: [...(prev[NO_GROUP_KEY] || []), props.address],
    }))
  }
  const removeUserFromContact = async () => {
    setParticipants(prevUsers =>
      prevUsers.filter(user =>
        !isGroupParticipant(user)
          ? user.account_address !== props.address
          : true
      )
    )

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
  const handleParticipantsChange = () => {
    if (isContactAlreadyAdded()) {
      removeUserFromContact()
    } else {
      addUserFromContact()
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
            name={props.name}
          />
        </Box>
        <VStack alignItems="start" gap={1} width="calc(100% - 72px)">
          <Heading size={{ base: 'xs', md: 'sm' }}>
            {props.name || ellipsizeAddress(props.address || '')}{' '}
            {props.currentAccount?.address === props.address && '(You)'}
          </Heading>
        </VStack>
      </HStack>
      <Box flexBasis="43%">
        <Button
          colorScheme="primary"
          onClick={handleParticipantsChange}
          variant={isContactAlreadyAdded() ? 'outline' : 'solid'}
        >
          {isContactAlreadyAdded() ? 'Remove' : 'Add to Meeting'}
        </Button>
      </Box>
    </HStack>
  )
}

export default ContactMemberItem

import {
  Box,
  Button,
  Divider,
  Heading,
  HStack,
  Icon,
  Text,
  VStack,
} from '@chakra-ui/react'
import React, { useCallback, useContext, useMemo } from 'react'
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai'
import { IoMdClose } from 'react-icons/io'

import { AccountContext } from '@/providers/AccountProvider'
import { useScheduleNavigation } from '@/providers/schedule/NavigationContext'
import { useParticipants } from '@/providers/schedule/ParticipantsContext'
import { ParticipantInfo, ParticipantType } from '@/types/ParticipantInfo'
import { isGroupParticipant } from '@/types/schedule'
import { NO_GROUP_KEY } from '@/utils/constants/group'
import { deduplicateArray } from '@/utils/generic_utils'
import { getMergedParticipants } from '@/utils/schedule.helper'
import { useToastHelpers } from '@/utils/toasts'
import { ellipsizeAddress } from '@/utils/user_manager'

interface ScheduleParticipantsProps {
  isMobile?: boolean
}

export function ScheduleParticipants({ isMobile }: ScheduleParticipantsProps) {
  const {
    groupAvailability,
    setGroupAvailability,
    groupParticipants,
    setGroupParticipants,
    participants,
    setParticipants,
    groups: allGroups,
  } = useParticipants()
  const { currentAccount } = useContext(AccountContext)
  const { setInviteModalOpen } = useScheduleNavigation()
  const { showInfoToast } = useToastHelpers()
  const groups = useMemo(
    () =>
      participants.filter(val => {
        return isGroupParticipant(val)
      }),
    [participants]
  )
  const meetingMembers = useMemo(
    () => getMergedParticipants(participants, allGroups, groupParticipants),
    [participants, allGroups, groupParticipants]
  )
  const allAvailabilities = useMemo(
    () =>
      deduplicateArray(Object.values(groupAvailability).flat()).map(val =>
        val?.toLowerCase()
      ),
    [groupAvailability]
  )

  const addressToGroupMap = useMemo(() => {
    const map = new Map<string, string>()
    Object.entries(groupAvailability || {}).forEach(([groupKey, addresses]) => {
      addresses?.forEach(address => {
        if (address) map.set(address.toLowerCase(), groupKey)
      })
    })
    return map
  }, [groupAvailability])

  const handleAvailabilityChange = useCallback(
    (account_address?: string) => {
      if (!account_address) return
      React.startTransition(() => {
        const existingGroup = addressToGroupMap.get(
          account_address.toLowerCase()
        )

        if (existingGroup) {
          setGroupAvailability(prev => ({
            ...prev,
            [existingGroup]: (prev[existingGroup] || []).filter(
              val => val !== account_address
            ),
          }))
        } else {
          setGroupAvailability(prev => ({
            ...prev,
            [NO_GROUP_KEY]: [...(prev[NO_GROUP_KEY] || []), account_address],
          }))
        }
      })
    },
    [addressToGroupMap]
  )

  const totalParticipantsCount = useMemo(() => {
    const participantsMerged = getMergedParticipants(
      participants,
      allGroups,
      groupParticipants,
      currentAccount?.address || ''
    )
    return participantsMerged.length + 1
  }, [participants, allGroups, groupParticipants, currentAccount?.address])
  const handleParticipantRemove = (participant: ParticipantInfo) => {
    React.startTransition(() => {
      if (participant.account_address) {
        const account_address = participant.account_address?.toLowerCase()
        if (account_address === currentAccount?.address || !account_address) {
          showInfoToast(
            'Cannot remove meeting scheduler',
            'As the meeting scheduler, you must remain in this meeting.'
          )
          return
        }
        setParticipants(prev =>
          prev.filter(p =>
            isGroupParticipant(p)
              ? true
              : p.account_address?.toLowerCase() !== account_address
          )
        )

        setGroupAvailability(prev => {
          const updated = { ...prev }
          Object.keys(updated).forEach(key => {
            if (updated[key]?.includes(account_address)) {
              updated[key] = updated[key].filter(val => val !== account_address)
            }
          })
          return updated
        })

        setGroupParticipants(prev => {
          const updated = { ...prev }
          Object.keys(updated).forEach(key => {
            if (updated[key]?.includes(account_address)) {
              updated[key] = updated[key].filter(val => val !== account_address)
            }
          })
          return updated
        })
      } else {
        setParticipants(prev =>
          prev.filter(p =>
            isGroupParticipant(p)
              ? true
              : p.guest_email?.toLowerCase() !== participant.guest_email
          )
        )
      }
    })
  }
  return (
    <VStack
      py={isMobile ? 10 : 7}
      px={5}
      borderWidth={1}
      borderColor={'input-border'}
      rounded={12}
      gap={5}
      maxH={'80vh'}
      overflowY={'auto'}
      w={isMobile ? '100%' : 'fit-content'}
      mx={isMobile ? 'auto' : 0}
      bg="bg-surface-secondary"
      minW={isMobile ? 'none' : '315px'}
      display={{
        base: isMobile ? 'flex' : 'none',
        lg: 'flex',
      }}
      position="sticky"
      top={0}
      zIndex={1}
    >
      <HStack gap={9} w="100%" justify={'space-between'}>
        <Heading size={'sm'}>Select Participants</Heading>
        <Heading size={'sm'}>Delete</Heading>
      </HStack>
      <Divider bg={'neutral.400'} />
      {groups.length > 0 && totalParticipantsCount > 1 && (
        <VStack gap={2} alignItems="start" w="100%">
          {groups.length > 0 && (
            <Text textAlign="left">
              <b>Groups Selected:</b> {groups.map(val => val.name).join(', ')}
            </Text>
          )}
          {totalParticipantsCount > 1 && (
            <Text textAlign="left">
              <b>Number of Participants:</b> {totalParticipantsCount}
            </Text>
          )}
        </VStack>
      )}
      <VStack gap={4} w="100%">
        {meetingMembers?.map(participant => {
          return (
            <HStack
              key={
                participant.account_address ||
                participant.guest_email ||
                participant.name
              }
              width={'100%'}
              justifyContent={'space-between'}
              alignItems={'center'}
              h={'72px'}
            >
              <HStack alignItems={'center'}>
                <Box
                  onClick={() =>
                    handleAvailabilityChange(
                      participant.account_address?.toLowerCase()
                    )
                  }
                >
                  <Icon
                    as={
                      allAvailabilities.includes(
                        participant.account_address?.toLowerCase() || ''
                      )
                        ? AiOutlineEye
                        : AiOutlineEyeInvisible
                    }
                    cursor="pointer"
                    boxSize={6}
                    color="border-default-primary"
                    w={6}
                    h={6}
                  />
                </Box>
                <VStack
                  alignItems="flex-start"
                  ml={4}
                  gap={2}
                  py={8}
                  my="auto"
                  justifyContent={'center'}
                >
                  <Heading
                    size="sm"
                    lineHeight={'normal'}
                    maxW="180px"
                    whiteSpace="nowrap"
                    overflow="hidden"
                    textOverflow="ellipsis"
                    w={'fit-content'}
                  >
                    {participant.name ||
                      participant.guest_email ||
                      ellipsizeAddress(participant.account_address || '')}
                  </Heading>
                  {participant.type === ParticipantType.Scheduler && (
                    <Text fontSize={'sm'} color={'text-highlight-primary'}>
                      Organizer
                    </Text>
                  )}
                </VStack>
              </HStack>
              <Icon
                as={IoMdClose}
                w={5}
                h={5}
                display="block"
                cursor="pointer"
                color="text-highlight-primary"
                onClick={() => handleParticipantRemove(participant)}
              />
            </HStack>
          )
        })}
      </VStack>
      <Button
        variant="outline"
        colorScheme="primary"
        w="100%"
        px={4}
        py={3}
        onClick={() => setInviteModalOpen(true)}
      >
        Add more participants
      </Button>
    </VStack>
  )
}

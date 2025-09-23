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
import React, { useContext, useEffect, useMemo } from 'react'
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai'
import { IoMdClose } from 'react-icons/io'

import useAccountContext from '@/hooks/useAccountContext'
import { AccountContext } from '@/providers/AccountProvider'
import { useScheduleNavigation } from '@/providers/schedule/NavigationContext'
import { useParticipants } from '@/providers/schedule/ParticipantsContext'
import { useScheduleTimeDiscover } from '@/providers/schedule/ScheduleTimeDiscoverContext'
import {
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '@/types/ParticipantInfo'
import {
  QuickPollBySlugResponse,
  QuickPollParticipantStatus,
  QuickPollParticipantType,
} from '@/types/QuickPoll'
import { isGroupParticipant } from '@/types/schedule'
import { MeetingPermissions } from '@/utils/constants/schedule'
import { deduplicateArray } from '@/utils/generic_utils'
import { getMergedParticipants } from '@/utils/schedule.helper'
import { ellipsizeAddress } from '@/utils/user_manager'

interface ScheduleParticipantsProps {
  isMobile?: boolean
  isQuickPoll?: boolean
  pollData?: QuickPollBySlugResponse
  onAddParticipants?: () => void
  onAvailabilityToggle?: () => void
}

import { QuickPollParticipantWithAccount } from '@/types/QuickPoll'

const convertQuickPollParticipant = (
  participant: QuickPollParticipantWithAccount
): ParticipantInfo => {
  return {
    account_address: participant.account_address,
    name: participant.account_name || participant.guest_name || '',
    guest_email: participant.guest_email,
    type:
      participant.participant_type === QuickPollParticipantType.SCHEDULER
        ? ParticipantType.Scheduler
        : ParticipantType.Invitee,
    status:
      participant.status === QuickPollParticipantStatus.ACCEPTED
        ? ParticipationStatus.Accepted
        : ParticipationStatus.Pending,
    slot_id: '',
    meeting_id: '',
  }
}

export function ScheduleParticipants({
  isMobile,
  isQuickPoll,
  pollData,
  onAddParticipants,
  onAvailabilityToggle,
}: ScheduleParticipantsProps) {
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
  const { currentGuestEmail } = useScheduleTimeDiscover()

  const host = pollData?.poll.participants.find(
    p => p.participant_type === QuickPollParticipantType.SCHEDULER
  )
  const isHost =
    host?.account_address?.toLowerCase() ===
    currentAccount?.address?.toLowerCase()

  useEffect(() => {
    if (isQuickPoll && pollData) {
      const quickpollAvailability: Record<string, string[]> = {}
      const quickpollParticipants: Record<string, string[]> = {}

      const participantIdentifiers = pollData.poll.participants
        .map(
          p => p.account_address?.toLowerCase() || p.guest_email?.toLowerCase()
        )
        .filter(Boolean) as string[]

      const groupKey = `quickpoll-${pollData.poll.id}`

      quickpollAvailability[groupKey] = participantIdentifiers
      quickpollParticipants[groupKey] = participantIdentifiers

      setGroupAvailability(quickpollAvailability)
      setGroupParticipants(quickpollParticipants)
    }
  }, [isQuickPoll, pollData, setGroupAvailability, setGroupParticipants])

  const groups = useMemo(
    () =>
      participants.filter(val => {
        return isGroupParticipant(val)
      }),
    [participants]
  )

  // Use poll participants for quickpoll, real participants for group scheduling
  const meetingMembers = useMemo(() => {
    if (isQuickPoll && pollData) {
      const allParticipants = pollData.poll.participants.map(
        convertQuickPollParticipant
      )

      if (isHost) {
        return allParticipants
      }

      const hasSeeGuestListPermission = pollData.poll.permissions?.includes(
        MeetingPermissions.SEE_GUEST_LIST
      )

      if (!hasSeeGuestListPermission) {
        const scheduler = allParticipants.find(
          p => p.type === ParticipantType.Scheduler
        )

        const currentParticipant = allParticipants.find(
          p =>
            p.account_address?.toLowerCase() ===
              currentAccount?.address?.toLowerCase() ||
            (currentGuestEmail &&
              p.guest_email?.toLowerCase() === currentGuestEmail.toLowerCase())
        )

        return [scheduler, currentParticipant].filter(
          Boolean
        ) as ParticipantInfo[]
      }

      return allParticipants
    }

    // For group scheduling, use existing logic
    return getMergedParticipants(
      participants,
      allGroups,
      groupParticipants,
      currentAccount?.address
    )
      .concat([
        {
          account_address: currentAccount?.address,
          name: currentAccount?.preferences?.name,
          type: ParticipantType.Scheduler,
          status: ParticipationStatus.Accepted,
          slot_id: '',
          meeting_id: '',
        },
      ])
      .filter(val => !val.isHidden)
  }, [
    isQuickPoll,
    pollData,
    participants,
    allGroups,
    groupParticipants,
    currentAccount?.address,
    isHost,
    currentGuestEmail, // Get from context
  ])

  const allAvailabilities = useMemo(
    () =>
      deduplicateArray(Object.values(groupAvailability).flat()).map(val =>
        val.toLowerCase()
      ),
    [groupAvailability]
  )

  const handleAvailabilityChange = (identifier?: string) => {
    if (!identifier) return
    const keys = Object.keys(groupAvailability)
    for (const key of keys) {
      setGroupAvailability(prev => {
        const allGroupParticipants = prev[key] || []
        const newParticipants = allAvailabilities.includes(identifier)
          ? allGroupParticipants.filter(val => val !== identifier)
          : [...allGroupParticipants, identifier]
        return {
          ...prev,
          [key]: newParticipants,
        }
      })
    }

    if (isQuickPoll && onAvailabilityToggle) {
      onAvailabilityToggle()
    }
  }

  const totalParticipantsCount = useMemo(() => {
    if (isQuickPoll && pollData) {
      return pollData.poll.participants.length
    }

    const participantsMerged = getMergedParticipants(
      participants,
      allGroups,
      groupParticipants,
      currentAccount?.address || ''
    )
    return participantsMerged.length + 1
  }, [
    isQuickPoll,
    pollData,
    participants,
    allGroups,
    groupParticipants,
    currentAccount?.address,
  ])

  const handleParticipantRemove = (participant: ParticipantInfo) => {
    if (isQuickPoll) {
      return
    }

    React.startTransition(() => {
      setParticipants(prev =>
        prev.filter(p =>
          isGroupParticipant(p)
            ? true
            : p.account_address?.toLowerCase() !==
              participant.account_address?.toLowerCase()
        )
      )
      const account_address = participant.account_address?.toLowerCase()
      if (account_address === currentAccount?.address || !account_address)
        return
      const keys = Object.keys(groupAvailability)
      for (const key of keys) {
        setGroupParticipants(prev => {
          const allGroupParticipants = prev[key] || []
          const newParticipants = allGroupParticipants.includes(account_address)
            ? allGroupParticipants.filter(val => val !== account_address)
            : [...allGroupParticipants, account_address]
          return {
            ...prev,
            [key]: newParticipants,
          }
        })

        setGroupAvailability(prev => {
          const allGroupAvailability = prev[key] || []
          const newAvailability = allGroupAvailability.includes(account_address)
            ? allGroupAvailability.filter(val => val !== account_address)
            : [...allGroupAvailability, account_address]
          return {
            ...prev,
            [key]: newAvailability,
          }
        })
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
      minH="80vh"
      maxH={'90vh'}
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
        <Heading size={'sm'}>
          {isQuickPoll ? 'Participants' : 'Select Participants'}
        </Heading>
        {!isQuickPoll && <Heading size={'sm'}>Delete</Heading>}
      </HStack>
      <Divider bg={'neutral.400'} />
      {!isQuickPoll && groups.length > 0 && totalParticipantsCount > 1 && (
        <VStack gap={2} alignItems="start">
          {groups.length > 0 && (
            <Text>
              <b>Groups Selected:</b> {groups.map(val => val.name).join(', ')}
            </Text>
          )}
          {totalParticipantsCount > 1 && (
            <Text>
              <b>Number of Participants:</b> {totalParticipantsCount}
            </Text>
          )}
        </VStack>
      )}
      <VStack gap={4} w="100%">
        {meetingMembers?.map((participant: ParticipantInfo, index: number) => {
          return (
            <HStack
              key={index}
              width={'100%'}
              justifyContent={'space-between'}
              alignItems={'center'}
              h={'72px'}
            >
              <HStack>
                <Box
                  onClick={() =>
                    handleAvailabilityChange(
                      participant.account_address?.toLowerCase() ||
                        participant.guest_email?.toLowerCase()
                    )
                  }
                >
                  <Icon
                    as={
                      allAvailabilities.includes(
                        participant.account_address?.toLowerCase() ||
                          participant.guest_email?.toLowerCase() ||
                          ''
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
                    maxW="300px"
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
              {!isQuickPoll && (
                <Icon
                  as={IoMdClose}
                  w={5}
                  h={5}
                  display="block"
                  cursor="pointer"
                  color="text-highlight-primary"
                  onClick={() => handleParticipantRemove(participant)}
                />
              )}
            </HStack>
          )
        })}
      </VStack>
      {!isQuickPoll && (
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
      )}

      {isQuickPoll && onAddParticipants && isHost && (
        <Button
          colorScheme="primary"
          w="100%"
          px={4}
          py={3}
          onClick={onAddParticipants}
        >
          Add participants
        </Button>
      )}
    </VStack>
  )
}

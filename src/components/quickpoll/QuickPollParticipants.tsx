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
import React, { useContext, useMemo } from 'react'
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai'
import { IoMdClose } from 'react-icons/io'

import { AccountContext } from '@/providers/AccountProvider'
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
import { MeetingPermissions } from '@/utils/constants/schedule'
import { ellipsizeAddress } from '@/utils/user_manager'

interface QuickPollParticipantsProps {
  isMobile?: boolean
  pollData?: QuickPollBySlugResponse
  onAddParticipants?: () => void
  onAvailabilityToggle?: () => void
  currentGuestEmail?: string
}

const convertQuickPollParticipant = (participant: any): ParticipantInfo => {
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

export function QuickPollParticipants({
  isMobile,
  pollData,
  onAddParticipants,
  onAvailabilityToggle,
  currentGuestEmail,
}: QuickPollParticipantsProps) {
  const { currentAccount } = useContext(AccountContext)

  const host = pollData?.poll.participants.find(
    p => p.participant_type === QuickPollParticipantType.SCHEDULER
  )
  const isHost =
    host?.account_address?.toLowerCase() ===
    currentAccount?.address?.toLowerCase()

  // Use poll participants for quickpoll
  const meetingMembers = useMemo(() => {
    if (!pollData) return []

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
  }, [pollData, isHost, currentAccount, currentGuestEmail])

  const totalParticipantsCount = useMemo(() => {
    if (!pollData) return 0
    return pollData.poll.participants.length
  }, [pollData])

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
        <Heading size={'sm'}>Participants</Heading>
        {isHost && <Heading size={'sm'}>Delete</Heading>}
      </HStack>
      <Divider bg={'neutral.400'} />

      <VStack gap={2} alignItems="flex-start">
        <Text>
          <b>Number of Participants:</b> {totalParticipantsCount}
        </Text>
      </VStack>

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
              {isHost && (
                <Icon
                  as={IoMdClose}
                  w={5}
                  h={5}
                  display="block"
                  cursor="pointer"
                  color="text-highlight-primary"
                  onClick={() => {
                    // TODO: Implement participant removal for hosts
                  }}
                />
              )}
            </HStack>
          )
        })}
      </VStack>

      {onAddParticipants && isHost && (
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

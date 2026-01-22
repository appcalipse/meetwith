import {
  Box,
  Button,
  Divider,
  Heading,
  HStack,
  Icon,
  Link,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import { useCallback, useContext, useMemo, useState } from 'react'
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai'
import { IoMdClose } from 'react-icons/io'

import { AccountContext } from '@/providers/AccountProvider'
import { useQuickPollAvailability } from '@/providers/quickpoll/QuickPollAvailabilityContext'
import { useParticipants } from '@/providers/schedule/ParticipantsContext'
import {
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '@/types/ParticipantInfo'
import {
  QuickPollBySlugResponse,
  QuickPollParticipant,
  QuickPollParticipantStatus,
  QuickPollParticipantType,
} from '@/types/QuickPoll'
import { MeetingPermissions } from '@/utils/constants/schedule'
import { queryClient } from '@/utils/react_query'
import { getGuestPollDetails } from '@/utils/storage'
import { ellipsizeAddress } from '@/utils/user_manager'

import InviteParticipants from '../schedule/participants/InviteParticipants'

interface QuickPollParticipantsProps {
  isMobile?: boolean
  pollData?: QuickPollBySlugResponse
  onAddParticipants?: () => void
  onAvailabilityToggle?: () => void
  currentGuestEmail?: string
  onParticipantAdded?: () => void
  onParticipantRemoved?: (participantId: string) => void
}

const convertQuickPollParticipant = (
  participant: QuickPollParticipant
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

export function QuickPollParticipants({
  isMobile,
  pollData,
  onAddParticipants,
  onAvailabilityToggle,
  currentGuestEmail,
  onParticipantAdded,
  onParticipantRemoved,
}: QuickPollParticipantsProps) {
  const { currentAccount } = useContext(AccountContext)
  const router = useRouter()

  const { setCurrentParticipantId } = useQuickPollAvailability()

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const {
    setParticipants,
    groupAvailability,
    setGroupAvailability,
    setGroupParticipants,
    groupParticipants,
    participants,
  } = useParticipants()

  const handleParticipantAdded = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['quickpoll-public'] })
    queryClient.invalidateQueries({ queryKey: ['quickpoll-schedule'] })
    onParticipantAdded?.()
  }, [onParticipantAdded])

  const handleOpenInviteModal = useCallback(() => {
    if (pollData?.poll?.participants) {
      const convertedParticipants = pollData.poll.participants.map(
        participant => convertQuickPollParticipant(participant)
      )
      setParticipants(convertedParticipants)
    }
    setIsInviteModalOpen(true)
  }, [pollData, setParticipants])
  const inviteKey = useMemo(
    () =>
      `${Object.values(groupAvailability).flat().length}-${
        Object.values(groupParticipants).flat().length
      }-${participants.length}`,
    [groupAvailability, groupParticipants, participants]
  )
  const host = pollData?.poll.participants.find(
    p => p.participant_type === QuickPollParticipantType.SCHEDULER
  )
  const isHost =
    host?.account_address?.toLowerCase() ===
    currentAccount?.address?.toLowerCase()

  const groupKey = useMemo(() => {
    return pollData ? `quickpoll-${pollData.poll.id}` : ''
  }, [pollData])

  const meetingMembers = useMemo(() => {
    if (!pollData) return []

    const allParticipants = pollData.poll.participants.map(participant =>
      convertQuickPollParticipant(participant)
    )

    const currentGroupParticipants = groupParticipants[groupKey] || []
    const currentGroupParticipantsSet = new Set(
      currentGroupParticipants.map(p => p.toLowerCase())
    )

    const filteredParticipants = allParticipants.filter(participant => {
      const identifier = (
        participant.account_address || participant.guest_email
      )?.toLowerCase()
      return identifier && currentGroupParticipantsSet.has(identifier)
    })

    if (isHost) {
      return filteredParticipants
    }

    const hasSeeGuestListPermission = pollData.poll.permissions?.includes(
      MeetingPermissions.SEE_GUEST_LIST
    )

    if (!hasSeeGuestListPermission) {
      const scheduler = filteredParticipants.find(
        p => p.type === ParticipantType.Scheduler
      )

      const currentParticipant = filteredParticipants.find(
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

    return filteredParticipants
  }, [
    pollData,
    isHost,
    currentAccount,
    currentGuestEmail,
    groupParticipants,
    groupKey,
  ])

  const totalParticipantsCount = useMemo(() => {
    if (!pollData) return 0
    return pollData.poll.participants.length
  }, [pollData])

  const allAvailabilities = useMemo(() => {
    if (!groupKey) return []
    return (groupAvailability[groupKey] || []).map(val => val.toLowerCase())
  }, [groupAvailability, groupKey])

  const handleAvailabilityChange = (
    account_address?: string,
    guest_email?: string
  ) => {
    if (!account_address && !guest_email) return

    const identifier = (account_address || guest_email)?.toLowerCase()
    if (!identifier) return

    setGroupAvailability(prev => {
      const currentParticipants = prev[groupKey] || []
      const newParticipants = allAvailabilities.includes(identifier)
        ? currentParticipants.filter(val => val.toLowerCase() !== identifier)
        : [...currentParticipants, identifier]

      return {
        ...prev,
        [groupKey]: newParticipants,
      }
    })
  }

  const handleParticipantRemove = (participant: ParticipantInfo) => {
    if (pollData?.poll?.participants) {
      const match = pollData.poll.participants.find(p => {
        const id1 = (p.account_address || p.guest_email || '').toLowerCase()
        const id2 = (
          participant.account_address ||
          participant.guest_email ||
          ''
        ).toLowerCase()
        return id1 && id1 === id2
      })
      if (match?.id) {
        onParticipantRemoved?.(match.id)
      }
    }

    const identifier = (
      participant.account_address || participant.guest_email
    )?.toLowerCase()
    if (!identifier) return

    setGroupAvailability(prev => {
      const currentParticipants = prev[groupKey] || []
      const newParticipants = currentParticipants.filter(
        val => val.toLowerCase() !== identifier
      )

      return {
        ...prev,
        [groupKey]: newParticipants,
      }
    })

    setGroupParticipants(prev => {
      const currentParticipants = prev[groupKey] || []
      const newParticipants = currentParticipants.filter(
        val => val.toLowerCase() !== identifier
      )

      return {
        ...prev,
        [groupKey]: newParticipants,
      }
    })
  }

  const handleEditProfile = useCallback(() => {
    if (!pollData?.poll?.id) return

    // Get participant ID from localStorage for this poll
    const guestDetails = getGuestPollDetails(pollData.poll.id)

    if (guestDetails?.participantId) {
      setCurrentParticipantId(guestDetails.participantId)
      router.push({
        pathname: router.pathname,
        query: {
          ...router.query,
          tab: 'guest-details',
          participantId: guestDetails.participantId,
        },
      })
    }
  }, [pollData?.poll?.id, router, setCurrentParticipantId])

  return (
    <VStack
      py={{ base: 6, md: 7 }}
      px={{ base: 4, md: 5 }}
      borderWidth={1}
      borderColor={'input-border'}
      rounded={12}
      gap={{ base: 4, md: 5 }}
      minH={{ base: 'auto', md: '80vh' }}
      maxH={{ base: 'auto', md: '90vh' }}
      overflowY={{ base: 'visible', md: 'auto' }}
      w={{ base: '100%', md: 'fit-content' }}
      mx={{ base: 'auto', md: 0 }}
      bg="bg-surface-secondary"
      minW={{ base: 'none', md: '315px' }}
      display={{
        base: isMobile ? 'flex' : 'none',
        lg: 'flex',
      }}
      position={{ base: 'static', md: 'sticky' }}
      top={0}
      zIndex={1}
    >
      <HStack gap={{ base: 6, md: 9 }} w="100%" justify={'space-between'}>
        <Heading size={{ base: 'xs', md: 'sm' }}>Participants</Heading>
        {isHost && <Heading size={{ base: 'xs', md: 'sm' }}>Delete</Heading>}
      </HStack>
      <Divider bg={'divider-dark'} />

      <VStack gap={2} alignItems="flex-start" w="100%">
        <Text fontSize={{ base: 'sm', md: 'md' }} textAlign="left">
          <b>Number of Participants:</b> {totalParticipantsCount}
        </Text>
      </VStack>

      <VStack gap={{ base: 3, md: 4 }} w="100%">
        {meetingMembers?.map((participant: ParticipantInfo, index: number) => {
          return (
            <HStack
              key={index}
              width={'100%'}
              justifyContent={'space-between'}
              alignItems={'center'}
              h={{ base: '60px', md: '72px' }}
            >
              <HStack>
                <Box
                  onClick={() =>
                    handleAvailabilityChange(
                      participant.account_address?.toLowerCase(),
                      participant.guest_email?.toLowerCase()
                    )
                  }
                >
                  <Icon
                    as={
                      allAvailabilities.includes(
                        (
                          participant.account_address || participant.guest_email
                        )?.toLowerCase() || ''
                      )
                        ? AiOutlineEye
                        : AiOutlineEyeInvisible
                    }
                    cursor="pointer"
                    boxSize={{ base: 5, md: 6 }}
                    color="border-default-primary"
                    w={{ base: 5, md: 6 }}
                    h={{ base: 5, md: 6 }}
                  />
                </Box>
                <VStack
                  alignItems="flex-start"
                  ml={{ base: 3, md: 4 }}
                  gap={{ base: 1, md: 2 }}
                  py={{ base: 6, md: 8 }}
                  my="auto"
                  justifyContent={'center'}
                >
                  <Heading
                    size={{ base: 'xs', md: 'sm' }}
                    lineHeight={'normal'}
                    maxW={{ base: '200px', md: '180px' }}
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
                    <Text
                      fontSize={{ base: 'xs', md: 'sm' }}
                      color={'text-highlight-primary'}
                    >
                      Organizer
                    </Text>
                  )}
                  {/* Show Edit profile link for guests viewing their own profile */}
                  {!participant.account_address &&
                    participant.guest_email &&
                    currentGuestEmail &&
                    participant.guest_email.toLowerCase() ===
                      currentGuestEmail.toLowerCase() && (
                      <Link
                        fontSize={{ base: 'xs', md: 'sm' }}
                        color="primary.200"
                        textDecoration="underline"
                        cursor="pointer"
                        onClick={handleEditProfile}
                        _hover={{ color: 'primary.300' }}
                      >
                        Edit profile
                      </Link>
                    )}
                </VStack>
              </HStack>
              {isHost && (
                <Icon
                  as={IoMdClose}
                  w={{ base: 4, md: 5 }}
                  h={{ base: 4, md: 5 }}
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

      {isHost && (
        <Button
          colorScheme="primary"
          w="100%"
          px={{ base: 3, md: 4 }}
          py={{ base: 2.5, md: 3 }}
          fontSize={{ base: 'sm', md: 'md' }}
          onClick={handleOpenInviteModal}
        >
          Add participants
        </Button>
      )}

      <InviteParticipants
        key={inviteKey}
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        isQuickPoll={true}
        pollData={pollData}
        groupAvailability={groupAvailability}
        groupParticipants={groupParticipants}
        participants={participants}
        handleUpdateParticipants={setParticipants}
        handleUpdateGroups={(
          groupAvailability: Record<string, Array<string> | undefined>,
          groupParticipants: Record<string, Array<string> | undefined>
        ) => {
          setGroupAvailability(groupAvailability)
          setGroupParticipants(groupParticipants)
        }}
        onInviteSuccess={() => {
          handleParticipantAdded()
          setIsInviteModalOpen(false)
        }}
      />
    </VStack>
  )
}

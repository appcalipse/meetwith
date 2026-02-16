import {
  Heading,
  HStack,
  Icon,
  useBreakpointValue,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Interval } from 'luxon'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useState } from 'react'
import { FaArrowLeft } from 'react-icons/fa6'

import useAccountContext from '@/hooks/useAccountContext'
import { useQuickPollAvailability } from '@/providers/quickpoll/QuickPollAvailabilityContext'
import { useParticipants } from '@/providers/schedule/ParticipantsContext'
import { useScheduleState } from '@/providers/schedule/ScheduleContext'
import { EditMode } from '@/types/Dashboard'
import { ParticipantInfo } from '@/types/ParticipantInfo'
import {
  PollVisibility,
  QuickPollBySlugResponse,
  QuickPollIntent,
  QuickPollParticipant,
} from '@/types/QuickPoll'
import {
  fetchBusySlotsRawForQuickPollParticipants,
  getExistingAccounts,
  getPollParticipantByIdentifier,
  getQuickPollById,
  updatePollParticipantAvailability,
  updateQuickPoll,
} from '@/utils/api_helper'
import { parseMonthAvailabilitiesToDate } from '@/utils/date_helper'
import {
  computeAvailabilitySlotsWithOverrides,
  computeBaseAvailability,
  convertBusySlotsToIntervals,
  convertSelectedSlotsToAvailabilitySlots,
  getMonthRange,
  mergeAvailabilitySlots,
} from '@/utils/quickpoll_helper'
import { getGuestPollDetails } from '@/utils/storage'
import { useToastHelpers } from '@/utils/toasts'

import CustomError from '../CustomError'
import CustomLoading from '../CustomLoading'
import { Grid4 } from '../icons/Grid4'
import InviteParticipants from '../schedule/participants/InviteParticipants'
import {
  AvailabilityTrackerProvider,
  useAvailabilityTracker,
} from '../schedule/schedule-time-discover/AvailabilityTracker'
import GuestIdentificationModal from './GuestIdentificationModal'
import MobileQuickPollParticipantModal from './MobileQuickPollParticipant'
import { QuickPollParticipants } from './QuickPollParticipants'
import { QuickPollPickAvailability } from './QuickPollPickAvailability'
import QuickPollSaveChangesModal from './QuickPollSaveChangesModal'

export type MeetingMembers = ParticipantInfo & { isCalendarConnected?: boolean }

interface QuickPollAvailabilityDiscoverProps {
  pollId?: string
  pollData?: QuickPollBySlugResponse
  onNavigateToGuestDetails?: () => void
}

const QuickPollAvailabilityDiscoverInner: React.FC<
  QuickPollAvailabilityDiscoverProps
> = ({ pollId, pollData, onNavigateToGuestDetails }) => {
  const {
    isInviteParticipantsOpen,
    showGuestIdModal,
    currentParticipantId,
    currentGuestEmail,
    isEditingAvailability,
    isSavingAvailability,
    isRefreshingAvailabilities,
    setIsInviteParticipantsOpen,
    setShowGuestIdModal,
    setCurrentParticipantId,
    setCurrentGuestEmail,
    setIsEditingAvailability,
    setIsSavingAvailability,
    setIsRefreshingAvailabilities,
  } = useQuickPollAvailability()
  const {
    groupAvailability,
    groupParticipants,
    participants,
    setGroupAvailability,
    setGroupParticipants,
    setParticipants,
  } = useParticipants()
  const inviteKey = useMemo(
    () =>
      `${Object.values(groupAvailability).flat().length}-${
        Object.values(groupParticipants).flat().length
      }-${participants.length}`,
    [groupAvailability, groupParticipants, participants]
  )
  const router = useRouter()
  const toast = useToast()
  const { showSuccessToast, showErrorToast } = useToastHelpers()
  const currentAccount = useAccountContext()
  const { timezone, currentSelectedDate } = useScheduleState()
  const { clearSlots, selectedSlots } = useAvailabilityTracker()
  const queryClient = useQueryClient()

  const {
    data: fetchedPollData,
    isLoading: isPollLoading,
    error: pollError,
  } = useQuery({
    queryKey: ['quickpoll-schedule', pollId],
    queryFn: () => getQuickPollById(pollId!),
    enabled: !!pollId,
    onError: (err: unknown) => {
      showErrorToast(
        'Failed to load poll',
        'There was an error loading the poll data.'
      )
    },
  })

  const currentPollData =
    (fetchedPollData as QuickPollBySlugResponse) || pollData

  const isDesktop = useBreakpointValue({ base: false, md: true }) ?? false

  useEffect(() => {
    if (!currentAccount?.address || !currentPollData?.poll?.participants) {
      return
    }

    const accountParticipant = currentPollData.poll.participants.find(
      participant =>
        participant.account_address?.toLowerCase() ===
        currentAccount.address.toLowerCase()
    )

    if (
      accountParticipant?.id &&
      accountParticipant.id !== currentParticipantId
    ) {
      setCurrentParticipantId(accountParticipant.id)
    }
  }, [
    currentAccount?.address,
    currentPollData?.poll?.participants,
    currentParticipantId,
    setCurrentParticipantId,
  ])

  const refreshAvailabilities = async () => {
    try {
      setIsRefreshingAvailabilities(true)
      if (currentPollData?.poll?.slug) {
        await queryClient.invalidateQueries({
          queryKey: ['quickpoll-public', currentPollData.poll.slug],
        })
      }
      clearSlots()
    } finally {
      setIsRefreshingAvailabilities(false)
    }
  }

  // Get poll info from props or router query
  const currentPollId =
    pollId || (router.query.pollId as string) || currentPollData?.poll.id
  const currentPollTitle = currentPollData?.poll.title || 'Poll'

  const showBack = !!currentAccount

  // Track participant removals to prompt save
  const [removedParticipantIds, setRemovedParticipantIds] = useState<string[]>(
    []
  )
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const onParticipantRemoved = (id: string) => {
    setRemovedParticipantIds(prev => (prev.includes(id) ? prev : [...prev, id]))
  }

  const {
    currentIntent,
    setCurrentIntent,
    setGuestAvailabilitySlots,
    setCurrentTimezone,
  } = useQuickPollAvailability()

  // Load guest details from localStorage for guests
  useEffect(() => {
    if (!currentAccount && currentPollData) {
      const storedDetails = getGuestPollDetails(currentPollData.poll.id)
      if (storedDetails) {
        setCurrentParticipantId(storedDetails.participantId)
        setCurrentGuestEmail(storedDetails.email)
      }
    }
  }, [
    currentAccount,
    currentPollData,
    setCurrentParticipantId,
    setCurrentGuestEmail,
  ])

  useEffect(() => {
    if (router.query.intent) {
      setCurrentIntent(router.query.intent as QuickPollIntent)
    } else {
      setCurrentIntent(QuickPollIntent.EDIT_AVAILABILITY)
    }
  }, [router.query.intent, setCurrentIntent])

  const isSchedulingIntent = currentIntent === QuickPollIntent.SCHEDULE

  const { mutate: saveRemovals, isLoading: isSavingRemovals } = useMutation({
    mutationFn: async () =>
      updateQuickPoll(currentPollId!, {
        participants: { toRemove: removedParticipantIds },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['quickpoll-public'] })
      await queryClient.invalidateQueries({ queryKey: ['quickpoll-schedule'] })
      showSuccessToast('Changes saved', 'Participant updates have been saved.')
      setIsConfirmOpen(false)
      setRemovedParticipantIds([])
      router.push(`/dashboard/${EditMode.QUICKPOLL}`)
    },
    onError: () => {
      showErrorToast(
        'Failed to save changes',
        'There was an error saving participant changes.'
      )
    },
  })

  const handleClose = () => {
    if (removedParticipantIds.length > 0) {
      setIsConfirmOpen(true)
    } else {
      router.push(`/dashboard/${EditMode.QUICKPOLL}`)
    }
  }

  const handleDiscard = () => {
    setIsConfirmOpen(false)
    router.push(`/dashboard/${EditMode.QUICKPOLL}`)
  }

  const handleEditAvailability = () => {
    if (
      !currentAccount &&
      currentPollData?.poll.visibility === PollVisibility.PRIVATE
    ) {
      if (!currentParticipantId || !currentGuestEmail) {
        setShowGuestIdModal(true)
      } else {
        setIsEditingAvailability(true)
      }
    } else {
      setIsEditingAvailability(true)
    }
  }

  const handleSaveAvailability = async () => {
    if (!currentAccount) {
      // Check if guest has saved details in localStorage
      const storedDetails = getGuestPollDetails(currentPollData?.poll.id || '')

      const availabilitySlots =
        convertSelectedSlotsToAvailabilitySlots(selectedSlots)

      if (storedDetails && currentParticipantId) {
        setIsSavingAvailability(true)

        try {
          const participantRecord = currentPollData?.poll.participants.find(
            participant => participant.id === currentParticipantId
          )

          if (!participantRecord) {
            showErrorToast(
              'Participant not found',
              'You are not a participant in this poll.'
            )
            return
          }

          // Compute month range for base availability calculation
          const { monthStart, monthEnd } = getMonthRange(
            currentSelectedDate.toJSDate(),
            timezone
          )

          // Get busy slots from calendar for guests
          const busySlotsRaw = await fetchBusySlotsRawForQuickPollParticipants(
            [{ participant_id: currentParticipantId }],
            monthStart,
            monthEnd
          )
          const busyIntervals = convertBusySlotsToIntervals(busySlotsRaw)

          // Compute base availability (without existing overrides)
          // Guests don't have default availability, so pass empty array
          const baseAvailability = computeBaseAvailability(
            participantRecord,
            [],
            [],
            busyIntervals,
            monthStart,
            monthEnd,
            timezone
          )

          // Compute availability with overrides
          const availabilitySlots = computeAvailabilitySlotsWithOverrides(
            selectedSlots,
            baseAvailability,
            monthStart,
            monthEnd,
            timezone
          )

          // Merge with existing slots
          const mergedAvailability = mergeAvailabilitySlots(
            participantRecord.available_slots || [],
            availabilitySlots
          )

          await updatePollParticipantAvailability(
            storedDetails.participantId,
            mergedAvailability,
            timezone
          )

          setIsEditingAvailability(false)
          refreshAvailabilities()
          clearSlots()

          queryClient.invalidateQueries({ queryKey: ['quickpoll-public'] })
          queryClient.invalidateQueries({ queryKey: ['quickpoll-schedule'] })

          showSuccessToast(
            'Availability saved',
            'Your availability has been saved successfully.'
          )
        } catch (_error) {
          showErrorToast(
            'Failed to save availability',
            'There was an error saving your availability. Please try again.'
          )
        } finally {
          setIsSavingAvailability(false)
        }
      } else {
        // First-time guest: navigate to details form
        setGuestAvailabilitySlots(mergeAvailabilitySlots([], availabilitySlots))
        setCurrentTimezone(timezone)

        if (onNavigateToGuestDetails) {
          onNavigateToGuestDetails()
        }
      }
    } else {
      if (!currentPollData) return

      setIsSavingAvailability(true)

      try {
        if (currentAccount) {
          let participant: QuickPollParticipant

          try {
            participant = (await getPollParticipantByIdentifier(
              currentPollData.poll.slug,
              currentAccount.address
            )) as QuickPollParticipant
          } catch (_error) {
            showErrorToast(
              'Participant not found',
              'You are not a participant in this poll.'
            )
            return
          }

          // Compute month range for base availability calculation
          const { monthStart, monthEnd } = getMonthRange(
            currentSelectedDate.toJSDate(),
            timezone
          )

          // Get default availability and busy slots for account owners
          let defaultIntervals: Interval[] = []
          let busyIntervals: Interval[] = []

          if (currentAccount?.address) {
            // Only use account default when participant has no poll-specific slots
            if (!participant.available_slots?.length) {
              const account = await getExistingAccounts([
                currentAccount.address,
              ])
              if (
                account.length > 0 &&
                account[0].preferences?.availabilities?.length
              ) {
                defaultIntervals = parseMonthAvailabilitiesToDate(
                  account[0].preferences.availabilities,
                  monthStart,
                  monthEnd,
                  account[0].preferences.timezone || timezone
                )
              }
            }

            // Get busy slots from calendar
            const busySlotsRaw =
              await fetchBusySlotsRawForQuickPollParticipants(
                [{ account_address: currentAccount.address }],
                monthStart,
                monthEnd
              )
            busyIntervals = convertBusySlotsToIntervals(busySlotsRaw)
          }

          // Compute base availability
          const baseAvailability = computeBaseAvailability(
            participant,
            [],
            defaultIntervals,
            busyIntervals,
            monthStart,
            monthEnd,
            timezone
          )

          // Compute availability with overrides
          const availabilitySlots = computeAvailabilitySlotsWithOverrides(
            selectedSlots,
            baseAvailability,
            monthStart,
            monthEnd,
            timezone
          )

          // Merge with existing slots to preserve any slots outside the current month
          const mergedAvailability = mergeAvailabilitySlots(
            participant.available_slots || [],
            availabilitySlots
          )

          await updatePollParticipantAvailability(
            participant.id,
            mergedAvailability,
            currentAccount.preferences?.timezone || 'UTC'
          )

          setIsEditingAvailability(false)
          refreshAvailabilities()
          clearSlots() // Clear selected slots after saving

          queryClient.invalidateQueries({ queryKey: ['quickpoll-public'] })
          queryClient.invalidateQueries({ queryKey: ['quickpoll-schedule'] })

          showSuccessToast(
            'Availability saved',
            'Your availability has been saved successfully.'
          )
        }
      } catch (_error) {
        showErrorToast(
          'Failed to save availability',
          'There was an error saving your availability. Please try again.'
        )
      } finally {
        setIsSavingAvailability(false)
      }
    }
  }

  const handleGuestIdentification = async (email: string) => {
    try {
      const participant = await getPollParticipantByIdentifier(
        currentPollData!.poll.slug,
        email
      )

      if (participant) {
        setCurrentParticipantId(participant.id)
        setCurrentGuestEmail(email)
        setShowGuestIdModal(false)

        setIsEditingAvailability(true)
      } else {
        showErrorToast(
          'Participant not found',
          'No participant found with this email address.'
        )
      }
    } catch (_error) {
      showErrorToast(
        'Identification failed',
        'There was an error identifying you. Please try again.'
      )
    }
  }

  const handleSharePoll = () => {
    const pollSlug = currentPollData?.poll.slug || currentPollId
    const pollUrl = `${window.location.origin}/poll/${pollSlug}`
    navigator.clipboard.writeText(pollUrl)
    toast({
      title: 'Link Copied!',
      description: 'Poll link has been copied to clipboard.',
      status: 'success',
      duration: 3000,
      isClosable: true,
      position: 'top',
    })
  }

  const handleCloseGuestIdModal = () => {
    setShowGuestIdModal(false)
  }

  const handleAvailabilityAction = () => {
    if (isEditingAvailability) {
      handleSaveAvailability()
    } else {
      handleEditAvailability()
    }
  }

  const handleCancelEditing = () => {
    setIsEditingAvailability(false)
    clearSlots()
  }

  // Only show loading when we don't have pollData and we're fetching
  if (!pollData && isPollLoading) {
    return <CustomLoading text="Loading poll..." />
  }

  if (pollError && !currentPollData) {
    return (
      <CustomError
        title="Error loading poll"
        description="There was an error loading the poll data."
        imageAlt="Error loading poll"
      />
    )
  }

  return (
    <VStack
      width="100%"
      m="auto"
      alignItems="stretch"
      gap={3}
      p={{ base: 4, md: 0 }}
    >
      {/* Mobile Header */}
      <VStack
        display={{ base: 'flex', md: 'none' }}
        align="stretch"
        gap={4}
        w="100%"
      >
        {showBack && (
          <HStack
            cursor="pointer"
            onClick={handleClose}
            gap={2}
            alignItems={'center'}
          >
            <Icon as={FaArrowLeft} size="1.2em" color={'primary.500'} />
            <Heading fontSize={14} color="primary.500">
              Back
            </Heading>
          </HStack>
        )}

        <Heading fontSize="20px" fontWeight="700" color="text-primary">
          {isSchedulingIntent ? 'Schedule Meeting' : 'Add/Edit Availability'}
        </Heading>

        <Heading fontSize="16px" fontWeight="500" color="text-primary">
          Poll Title: {currentPollTitle}
        </Heading>
      </VStack>

      {/* Desktop Header */}
      <HStack
        justifyContent={'flex-start'}
        alignItems={'flex-start'}
        display={{ base: 'none', md: 'flex' }}
      >
        <HStack mb={6} gap={4} alignItems={'center'}>
          {showBack && (
            <HStack
              cursor="pointer"
              onClick={handleClose}
              gap={4}
              alignItems={'center'}
            >
              <Icon as={FaArrowLeft} size="1.5em" color={'primary.500'} />
              <Heading fontSize={16} color="primary.500">
                Back
              </Heading>
            </HStack>
          )}

          <Heading fontSize="24px" fontWeight="700" color="text-primary">
            {isSchedulingIntent ? 'Schedule Meeting' : 'Add/Edit Availability'}
          </Heading>
        </HStack>

        <Heading
          fontSize="24px"
          fontWeight="700"
          color="text-primary"
          justifySelf={'center'}
          ml="81px"
        >
          Poll Title: {currentPollTitle}
        </Heading>

        <Grid4
          w={8}
          h={8}
          onClick={() => setIsInviteParticipantsOpen(!isInviteParticipantsOpen)}
          cursor={'pointer'}
          display={{ base: 'block', lg: 'none' }}
        />
      </HStack>

      {/* Mobile Layout */}
      <VStack
        width="100%"
        align="stretch"
        gap={4}
        display={{ base: 'flex', md: 'none' }}
      >
        <MobileQuickPollParticipantModal
          onClose={() => setIsInviteParticipantsOpen(false)}
          isOpen={isInviteParticipantsOpen}
          pollData={currentPollData}
        />
        <QuickPollPickAvailability
          openParticipantModal={() => setIsInviteParticipantsOpen(true)}
          pollData={currentPollData}
          onSaveAvailability={handleAvailabilityAction}
          onCancelEditing={handleCancelEditing}
          onSharePoll={handleSharePoll}
          isEditingAvailability={isEditingAvailability}
          isSavingAvailability={isSavingAvailability}
          isRefreshingAvailabilities={isRefreshingAvailabilities}
        />
      </VStack>

      {/* Desktop Layout */}
      {isDesktop && (
        <HStack
          width="100%"
          justifyContent={'flex-start'}
          align={'flex-start'}
          height={'fit-content'}
          gap={'14px'}
        >
          <InviteParticipants
            key={inviteKey}
            onClose={() => setIsInviteParticipantsOpen(false)}
            isOpen={isInviteParticipantsOpen}
            isQuickPoll={true}
            pollData={currentPollData}
            onInviteSuccess={async () => {
              await queryClient.invalidateQueries({
                queryKey: ['quickpoll-public'],
              })
              await queryClient.invalidateQueries({
                queryKey: ['quickpoll-schedule'],
              })
              setIsInviteParticipantsOpen(false)
            }}
            groupAvailability={groupAvailability}
            groupParticipants={groupParticipants}
            participants={participants}
            handleUpdateGroups={(
              groupAvailability: Record<string, Array<string> | undefined>,
              groupParticipants: Record<string, Array<string> | undefined>
            ) => {
              setGroupAvailability(groupAvailability)
              setGroupParticipants(groupParticipants)
            }}
            handleUpdateParticipants={setParticipants}
          />
          <QuickPollParticipants
            pollData={currentPollData}
            onAddParticipants={() => setIsInviteParticipantsOpen(true)}
            onAvailabilityToggle={refreshAvailabilities}
            currentGuestEmail={currentGuestEmail}
            onParticipantRemoved={onParticipantRemoved}
          />
          <QuickPollPickAvailability
            openParticipantModal={() => setIsInviteParticipantsOpen(true)}
            pollData={currentPollData}
            onSaveAvailability={handleAvailabilityAction}
            onCancelEditing={handleCancelEditing}
            onSharePoll={handleSharePoll}
            isEditingAvailability={isEditingAvailability}
            isSavingAvailability={isSavingAvailability}
            isRefreshingAvailabilities={isRefreshingAvailabilities}
          />
        </HStack>
      )}

      {currentPollData?.poll.visibility === PollVisibility.PRIVATE && (
        <GuestIdentificationModal
          isOpen={showGuestIdModal}
          onClose={handleCloseGuestIdModal}
          onSubmit={handleGuestIdentification}
          pollTitle={currentPollData?.poll.title}
        />
      )}

      <QuickPollSaveChangesModal
        isOpen={isConfirmOpen}
        removedCount={removedParticipantIds.length}
        isSaving={isSavingRemovals}
        onDiscard={handleDiscard}
        onConfirm={() => saveRemovals()}
      />
    </VStack>
  )
}

const QuickPollAvailabilityDiscover: React.FC<
  QuickPollAvailabilityDiscoverProps
> = props => {
  return (
    <AvailabilityTrackerProvider>
      <QuickPollAvailabilityDiscoverInner {...props} />
    </AvailabilityTrackerProvider>
  )
}

export default QuickPollAvailabilityDiscover

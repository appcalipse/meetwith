import {
  Button,
  Heading,
  HStack,
  Icon,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useState } from 'react'
import { FaArrowLeft } from 'react-icons/fa6'

import useAccountContext from '@/hooks/useAccountContext'
import { useQuickPollAvailability } from '@/providers/quickpoll/QuickPollAvailabilityContext'
import { useScheduleState } from '@/providers/schedule/ScheduleContext'
import { EditMode } from '@/types/Dashboard'
import { ParticipantInfo } from '@/types/ParticipantInfo'
import {
  AvailabilitySlot,
  PollVisibility,
  QuickPollBySlugResponse,
  QuickPollIntent,
  QuickPollParticipant,
} from '@/types/QuickPoll'
import {
  getPollParticipantByIdentifier,
  getQuickPollById,
  updatePollParticipantAvailability,
  updateQuickPoll,
} from '@/utils/api_helper'
import { useToastHelpers } from '@/utils/toasts'

import ConnectCalendarModal from '../ConnectedCalendars/ConnectCalendarModal'
import CustomError from '../CustomError'
import CustomLoading from '../CustomLoading'
import { Grid4 } from '../icons/Grid4'
import InviteParticipants from '../schedule/participants/InviteParticipants'
import {
  AvailabilityTrackerProvider,
  useAvailabilityTracker,
} from '../schedule/schedule-time-discover/AvailabilityTracker'
import GuestIdentificationModal from './GuestIdentificationModal'
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
    showCalendarModal,
    showGuestIdModal,
    showCalendarImportFlow,
    currentParticipantId,
    currentGuestEmail,
    isEditingAvailability,
    isSavingAvailability,
    isRefreshingAvailabilities,
    setIsInviteParticipantsOpen,
    setShowCalendarModal,
    setShowGuestIdModal,
    setShowCalendarImportFlow,
    setCurrentParticipantId,
    setCurrentGuestEmail,
    setIsEditingAvailability,
    setIsSavingAvailability,
    setIsRefreshingAvailabilities,
  } = useQuickPollAvailability()

  const router = useRouter()
  const toast = useToast()
  const { showSuccessToast, showErrorToast } = useToastHelpers()
  const currentAccount = useAccountContext()
  const { timezone } = useScheduleState()
  const { getAvailabilitySlots, clearSlots, selectedSlots } =
    useAvailabilityTracker()
  const queryClient = useQueryClient()

  const {
    data: fetchedPollData,
    isLoading: isPollLoading,
    error: pollError,
  } = useQuery({
    queryKey: ['quickpoll-schedule', pollId],
    queryFn: () => getQuickPollById(pollId!),
    enabled: !!pollId && !pollData,
    onError: (err: unknown) => {
      showErrorToast(
        'Failed to load poll',
        'There was an error loading the poll data.'
      )
    },
  })

  const currentPollData =
    pollData || (fetchedPollData as QuickPollBySlugResponse)

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
      const slotsByDate = new Map<
        string,
        { weekday: number; ranges: Array<{ start: string; end: string }> }
      >()

      for (const slot of selectedSlots) {
        const date = slot.start.toFormat('yyyy-MM-dd')
        const weekday = slot.start.weekday === 7 ? 0 : slot.start.weekday
        const startTime = slot.start.toFormat('HH:mm')
        const endTime = slot.end.toFormat('HH:mm')

        if (!slotsByDate.has(date)) {
          slotsByDate.set(date, { weekday, ranges: [] })
        }

        slotsByDate.get(date)!.ranges.push({
          start: startTime,
          end: endTime,
        })
      }

      const availabilitySlots: AvailabilitySlot[] = []
      slotsByDate.forEach((value, date) => {
        availabilitySlots.push({
          weekday: value.weekday,
          ranges: value.ranges,
          date,
        })
      })

      // Store slots and timezone in context
      setGuestAvailabilitySlots(availabilitySlots)
      setCurrentTimezone(timezone)

      if (onNavigateToGuestDetails) {
        onNavigateToGuestDetails()
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
          } catch (error) {
            showErrorToast(
              'Participant not found',
              'You are not a participant in this poll.'
            )
            return
          }

          const availabilitySlots = getAvailabilitySlots()

          await updatePollParticipantAvailability(
            participant.id,
            availabilitySlots,
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
      } catch (error) {
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

        if (showCalendarImportFlow) {
          setShowCalendarImportFlow(false)
          setShowCalendarModal(true)
        } else {
          setIsEditingAvailability(true)
        }
      } else {
        showErrorToast(
          'Participant not found',
          'No participant found with this email address.'
        )
      }
    } catch (error) {
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

  const handleCalendarImport = () => {
    if (
      !currentAccount &&
      currentPollData?.poll.visibility === PollVisibility.PRIVATE
    ) {
      if (!currentParticipantId || !currentGuestEmail) {
        setShowCalendarImportFlow(true)
        setShowGuestIdModal(true)
      } else {
        setShowCalendarModal(true)
      }
    } else {
      setShowCalendarModal(true)
    }
  }

  const handleCloseGuestIdModal = () => {
    setShowGuestIdModal(false)
    setShowCalendarImportFlow(false)
  }

  const handleAvailabilityAction = () => {
    if (isEditingAvailability) {
      handleSaveAvailability()
    } else {
      handleEditAvailability()
    }
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
        <QuickPollPickAvailability
          openParticipantModal={() => setIsInviteParticipantsOpen(true)}
          pollData={currentPollData}
          onSaveAvailability={handleAvailabilityAction}
          onSharePoll={handleSharePoll}
          onImportCalendar={handleCalendarImport}
          isEditingAvailability={isEditingAvailability}
          isSavingAvailability={isSavingAvailability}
          isRefreshingAvailabilities={isRefreshingAvailabilities}
        />
      </VStack>

      {/* Desktop Layout */}
      <HStack
        width="100%"
        justifyContent={'flex-start'}
        align={'flex-start'}
        height={'fit-content'}
        gap={'14px'}
        display={{ base: 'none', md: 'flex' }}
      >
        <InviteParticipants
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
          onSharePoll={handleSharePoll}
          onImportCalendar={handleCalendarImport}
          isEditingAvailability={isEditingAvailability}
          isSavingAvailability={isSavingAvailability}
          isRefreshingAvailabilities={isRefreshingAvailabilities}
        />
      </HStack>

      {/* Calendar Import Modal */}
      <ConnectCalendarModal
        isOpen={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
        isQuickPoll={true}
        participantId={currentParticipantId}
        pollData={currentPollData}
        refetch={refreshAvailabilities}
        pollSlug={currentPollData?.poll.slug}
      />

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

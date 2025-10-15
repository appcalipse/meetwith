import { Heading, HStack, Icon, useToast, VStack } from '@chakra-ui/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useEffect, useMemo } from 'react'
import { FaArrowLeft } from 'react-icons/fa6'

import useAccountContext from '@/hooks/useAccountContext'
import { useQuickPollAvailability } from '@/providers/quickpoll/QuickPollAvailabilityContext'
import { useScheduleState } from '@/providers/schedule/ScheduleContext'
import { EditMode } from '@/types/Dashboard'
import { ParticipantInfo } from '@/types/ParticipantInfo'
import {
  AvailabilitySlot,
  QuickPollBySlugResponse,
  QuickPollIntent,
  QuickPollParticipant,
} from '@/types/QuickPoll'
import {
  getPollParticipantByIdentifier,
  getQuickPollById,
  updatePollParticipantAvailability,
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
import { QuickPollParticipants } from './QuickPollParticipants'
import { QuickPollPickAvailability } from './QuickPollPickAvailability'

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
    currentParticipantId,
    currentGuestEmail,
    isEditingAvailability,
    isSavingAvailability,
    isRefreshingAvailabilities,
    setIsInviteParticipantsOpen,
    setShowCalendarModal,
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

  const handleClose = () => {
    router.push(`/dashboard/${EditMode.QUICKPOLL}`)
  }

  const handleEditAvailability = () => {
    setIsEditingAvailability(true)
  }

  const handleSaveAvailability = async () => {
    if (!currentAccount) {
      const slotsByWeekday = new Map<number, { start: string; end: string }[]>()

      for (const slot of selectedSlots) {
        const weekday = slot.start.weekday === 7 ? 0 : slot.start.weekday
        const startTime = slot.start.toFormat('HH:mm')
        const endTime = slot.end.toFormat('HH:mm')

        if (!slotsByWeekday.has(weekday)) {
          slotsByWeekday.set(weekday, [])
        }

        slotsByWeekday.get(weekday)!.push({
          start: startTime,
          end: endTime,
        })
      }

      const availabilitySlots: AvailabilitySlot[] = []
      for (let weekday = 0; weekday < 7; weekday++) {
        const ranges = slotsByWeekday.get(weekday) || []
        availabilitySlots.push({
          weekday,
          ranges,
        })
      }

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
    setShowCalendarModal(true)
  }

  const handleCalendarConnectSuccess = () => {
    setShowCalendarModal(false)
    showSuccessToast(
      'Calendar connected',
      'Your calendar has been connected successfully!'
    )
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
        <HStack
          mb={6}
          cursor="pointer"
          onClick={handleClose}
          gap={4}
          alignItems={'center'}
        >
          <Icon as={FaArrowLeft} size="1.5em" color={'primary.500'} />
          <Heading fontSize={16} color="primary.500">
            Back
          </Heading>

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
        />
        <QuickPollParticipants
          pollData={currentPollData}
          onAddParticipants={() => setIsInviteParticipantsOpen(true)}
          onAvailabilityToggle={refreshAvailabilities}
          currentGuestEmail={currentGuestEmail}
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

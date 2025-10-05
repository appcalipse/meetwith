import { Heading, HStack, Icon, useToast, VStack } from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useMemo } from 'react'
import { FaArrowLeft } from 'react-icons/fa6'

import useAccountContext from '@/hooks/useAccountContext'
import {
  QuickPollAvailabilityProvider,
  useQuickPollAvailability,
} from '@/providers/quickpoll/QuickPollAvailabilityContext'
import { useScheduleState } from '@/providers/schedule/ScheduleContext'
import { EditMode } from '@/types/Dashboard'
import { ParticipantInfo } from '@/types/ParticipantInfo'
import {
  QuickPollBySlugResponse,
  QuickPollParticipant,
} from '@/types/QuickPoll'
import {
  getPollParticipantByIdentifier,
  updatePollParticipantAvailability,
} from '@/utils/api_helper'
import { useToastHelpers } from '@/utils/toasts'

import ConnectCalendarModal from '../ConnectedCalendars/ConnectCalendarModal'
import { Grid4 } from '../icons/Grid4'
import InviteParticipants from '../schedule/participants/InviteParticipants'
import { useAvailabilityTracker } from '../schedule/schedule-time-discover/AvailabilityTracker'
import GuestIdentificationModal from './GuestIdentificationModal'
import PollSuccessScreen from './PollSuccessScreen'
import { QuickPollParticipants } from './QuickPollParticipants'
import { QuickPollPickAvailability } from './QuickPollPickAvailability'

export type MeetingMembers = ParticipantInfo & { isCalendarConnected?: boolean }

interface QuickPollAvailabilityDiscoverProps {
  pollId?: string
  pollData?: QuickPollBySlugResponse
}

const QuickPollAvailabilityDiscoverInner: React.FC<
  QuickPollAvailabilityDiscoverProps
> = ({ pollId, pollData }) => {
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
    setShowGuestForm,
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

  const refreshAvailabilities = async () => {
    try {
      setIsRefreshingAvailabilities(true)
      if (pollData?.poll?.slug) {
        await queryClient.invalidateQueries({
          queryKey: ['quickpoll-public', pollData.poll.slug],
        })
      }
    } finally {
      setIsRefreshingAvailabilities(false)
    }
  }

  // Get poll info from props or router query
  const currentPollId =
    pollId || (router.query.pollId as string) || pollData?.poll.id
  const currentPollTitle = pollData?.poll.title || 'Poll'

  const handleClose = () => {
    router.push(`/dashboard/${EditMode.QUICKPOLL}`)
  }

  const handleEditAvailability = () => {
    if (!currentAccount) {
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
      if (!currentParticipantId || !currentGuestEmail) {
        showErrorToast(
          'Missing information',
          'Please identify yourself first before saving availability.'
        )
        return
      }

      const serializedSlots = selectedSlots.map(slot => ({
        slotKey: `${slot.start.toISO()}-${slot.end.toISO()}`,
        start: slot.start,
        end: slot.end,
        date: slot.date,
      }))

      const slotsParam = encodeURIComponent(JSON.stringify(serializedSlots))

      router.push(
        `/poll/${
          pollData?.poll.slug
        }/guest-details?participantId=${currentParticipantId}&email=${encodeURIComponent(
          currentGuestEmail
        )}&timezone=${encodeURIComponent(timezone)}&slots=${slotsParam}`
      )
    } else {
      if (!pollData) return

      setIsSavingAvailability(true)

      try {
        let participant: QuickPollParticipant

        if (currentAccount) {
          try {
            participant = (await getPollParticipantByIdentifier(
              pollData.poll.slug,
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
        pollData!.poll.slug,
        email
      )

      if (participant) {
        setCurrentParticipantId(participant.id)
        setCurrentGuestEmail(email) // Store guest email in context
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
    const pollSlug = pollData?.poll.slug || currentPollId
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

  const handleGuestSaveAvailability = () => {
    if (!currentAccount) {
      if (currentParticipantId) {
        router.push(
          `/poll/${
            pollData!.poll.slug
          }/guest-details?participantId=${currentParticipantId}`
        )
      } else {
        setShowGuestIdModal(true)
      }
    } else {
      handleSaveAvailability()
    }
  }

  const handleCalendarImport = () => {
    if (currentAccount) {
      setShowCalendarModal(true)
    } else {
      setShowCalendarImportFlow(true)
      setShowGuestIdModal(true)
    }
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

  return (
    <VStack
      width="100%"
      m="auto"
      alignItems="stretch"
      gap={3}
      p={{ base: 4, md: 0 }}
    >
      <HStack justifyContent={'flex-start'} alignItems={'flex-start'}>
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

          <Heading fontSize="24px" fontWeight="700" color="neutral.0">
            Add/Edit Availability
          </Heading>
        </HStack>

        <Heading
          fontSize="24px"
          fontWeight="700"
          color="neutral.0"
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

      <HStack
        width="100%"
        justifyContent={'flex-start'}
        align={'flex-start'}
        height={'fit-content'}
        gap={'14px'}
      >
        <InviteParticipants
          onClose={() => setIsInviteParticipantsOpen(false)}
          isOpen={isInviteParticipantsOpen}
        />
        <QuickPollParticipants
          pollData={pollData}
          onAddParticipants={() => setIsInviteParticipantsOpen(true)}
          onAvailabilityToggle={refreshAvailabilities}
          currentGuestEmail={currentGuestEmail}
        />
        <QuickPollPickAvailability
          openParticipantModal={() => setIsInviteParticipantsOpen(true)}
          pollData={pollData}
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
        pollData={pollData}
        refetch={refreshAvailabilities}
      />

      {/* Guest Identification Modal */}
      <GuestIdentificationModal
        isOpen={showGuestIdModal}
        onClose={() => setShowGuestIdModal(false)}
        onSubmit={handleGuestIdentification}
        pollTitle={pollData?.poll.title}
      />
    </VStack>
  )
}

const QuickPollAvailabilityDiscover: React.FC<
  QuickPollAvailabilityDiscoverProps
> = props => {
  return (
    <QuickPollAvailabilityProvider>
      <QuickPollAvailabilityDiscoverInner {...props} />
    </QuickPollAvailabilityProvider>
  )
}

export default QuickPollAvailabilityDiscover

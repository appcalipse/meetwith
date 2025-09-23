import { Heading, HStack, Icon, useToast, VStack } from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useMemo, useState } from 'react'
import { FaArrowLeft } from 'react-icons/fa6'

import useAccountContext from '@/hooks/useAccountContext'
import {
  ScheduleTimeDiscoverProvider,
  useScheduleTimeDiscover,
} from '@/providers/schedule/ScheduleTimeDiscoverContext'
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

import { Grid4 } from '../icons/Grid4'
import ConnectCalendarForPoll from '../quickpoll/ConnectCalendarForPoll'
import GuestIdentificationModal from '../quickpoll/GuestIdentificationModal'
import PollSuccessScreen from '../quickpoll/PollSuccessScreen'
import InviteParticipants from './participants/InviteParticipants'
import { useAvailabilityTracker } from './schedule-time-discover/AvailabilityTracker'
import { ScheduleParticipants } from './schedule-time-discover/ScheduleParticipants'
import { SchedulePickTime } from './schedule-time-discover/SchedulePickTime'

export type MeetingMembers = ParticipantInfo & { isCalendarConnected?: boolean }

interface ScheduleTimeDiscoverProps {
  // Optional props for quickpoll mode
  isQuickPoll?: boolean
  pollId?: string
  pollData?: QuickPollBySlugResponse
}

const ScheduleTimeDiscoverInner: React.FC<ScheduleTimeDiscoverProps> = ({
  isQuickPoll: propIsQuickPoll,
  pollId,
  pollData,
}) => {
  const {
    isInviteParticipantsOpen,
    showCalendarModal,
    showGuestIdModal,
    currentParticipantId,
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
  } = useScheduleTimeDiscover()

  const router = useRouter()
  const toast = useToast()
  const { showSuccessToast, showErrorToast } = useToastHelpers()
  const currentAccount = useAccountContext()
  const { getAvailabilitySlots, clearSlots } = useAvailabilityTracker()
  const queryClient = useQueryClient()

  const refreshAvailabilities = () => {
    try {
      setIsRefreshingAvailabilities(true)
      if (pollData?.poll?.slug) {
        queryClient.invalidateQueries({
          queryKey: ['quickpoll-public', pollData.poll.slug],
        })
      }
    } finally {
      setIsRefreshingAvailabilities(false)
    }
  }

  // Detect quickpoll mode from props or router query
  const isQuickPoll = useMemo(() => {
    return (
      propIsQuickPoll ||
      router.query.ref === 'quickpoll' ||
      !!router.query.pollId ||
      !!pollData
    )
  }, [propIsQuickPoll, router.query.ref, router.query.pollId, pollData])

  // Get poll info from props or router query
  const currentPollId =
    pollId || (router.query.pollId as string) || pollData?.poll.id
  const currentPollTitle = pollData?.poll.title || 'Poll'

  const handleClose = () => {
    if (isQuickPoll || router.query.ref === 'quickpoll') {
      router.push(`/dashboard/${EditMode.QUICKPOLL}`)
    } else {
      let url = `/dashboard/${EditMode.MEETINGS}`
      if (router.query.ref === 'group') {
        url = `/dashboard/${EditMode.GROUPS}`
      }
      router.push(url)
    }
  }

  const handleSaveAvailability = async () => {
    if (!pollData) return

    if (!isEditingAvailability) {
      setIsEditingAvailability(true)
      return
    }

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
            'You are not invited to this poll.'
          )
          return
        }
      } else {
        setShowGuestIdModal(true)
        return
      }

      setCurrentParticipantId(participant.id)

      const availabilitySlots = getAvailabilitySlots()

      await updatePollParticipantAvailability(
        participant.id,
        availabilitySlots,
        currentAccount?.preferences?.timezone || 'UTC'
      )

      setIsEditingAvailability(false)

      refreshAvailabilities()

      if (!currentAccount) {
        setShowGuestForm(true)
      } else {
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

        router.push(
          `/poll/${pollData!.poll.slug}/guest-details?participantId=${
            participant.id
          }`
        )
      } else {
        showErrorToast(
          'Participant not found',
          'No participant found with this email address.'
        )
      }
    } catch (error) {
      showErrorToast(
        'Error checking participant',
        'There was an error verifying your email. Please try again.'
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

          {isQuickPoll && (
            <Heading fontSize="24px" fontWeight="700" color="neutral.0">
              Add/Edit Availability
            </Heading>
          )}
        </HStack>

        {isQuickPoll && (
          <Heading
            fontSize="24px"
            fontWeight="700"
            color="neutral.0"
            justifySelf={'center'}
            ml="81px"
          >
            Poll Title: {currentPollTitle}
          </Heading>
        )}

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
        <ScheduleParticipants
          isQuickPoll={isQuickPoll}
          pollData={pollData}
          onAddParticipants={
            isQuickPoll ? () => setIsInviteParticipantsOpen(true) : undefined
          }
          onAvailabilityToggle={isQuickPoll ? refreshAvailabilities : undefined}
        />
        <SchedulePickTime
          openParticipantModal={() => setIsInviteParticipantsOpen(true)}
          isQuickPoll={isQuickPoll}
          pollData={pollData}
          onSaveAvailability={
            isQuickPoll ? handleGuestSaveAvailability : undefined
          }
          onSharePoll={isQuickPoll ? handleSharePoll : undefined}
          onImportCalendar={isQuickPoll ? handleCalendarImport : undefined}
          isEditingAvailability={isEditingAvailability}
          isSavingAvailability={isSavingAvailability}
          isRefreshingAvailabilities={isRefreshingAvailabilities}
        />
      </HStack>

      {/* Calendar Import Modal for Guests */}
      {isQuickPoll && currentParticipantId && (
        <ConnectCalendarForPoll
          isOpen={showCalendarModal}
          onClose={() => setShowCalendarModal(false)}
          participantId={currentParticipantId}
          pollData={pollData}
          onSuccess={handleCalendarConnectSuccess}
        />
      )}

      {/* Guest Identification Modal */}
      {isQuickPoll && (
        <GuestIdentificationModal
          isOpen={showGuestIdModal}
          onClose={() => setShowGuestIdModal(false)}
          onSubmit={handleGuestIdentification}
          pollTitle={pollData?.poll.title}
        />
      )}
    </VStack>
  )
}

const ScheduleTimeDiscover: React.FC<ScheduleTimeDiscoverProps> = props => {
  return (
    <ScheduleTimeDiscoverProvider>
      <ScheduleTimeDiscoverInner {...props} />
    </ScheduleTimeDiscoverProvider>
  )
}

export default ScheduleTimeDiscover

import {
  Container,
  Flex,
  TabPanel,
  TabPanels,
  Tabs,
  useToast,
} from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'

import Loading from '@/components/Loading'
import InviteParticipants from '@/components/schedule/participants/InviteParticipants'
import ScheduleBase from '@/components/schedule/ScheduleBase'
import ScheduleCompleted from '@/components/schedule/ScheduleCompleted'
import { MetricStateContext } from '@/providers/MetricStateProvider'
import {
  ActionsContext,
  IActionsContext,
} from '@/providers/schedule/ActionsContext'
import {
  NavigationProvider,
  Page,
  useScheduleNavigation,
} from '@/providers/schedule/NavigationContext'
import { useParticipants } from '@/providers/schedule/ParticipantsContext'
import { useScheduleState } from '@/providers/schedule/ScheduleContext'
import { MeetingProvider, SchedulingType } from '@/types/Meeting'
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
import { scheduleMeeting } from '@/utils/calendar_manager'
import { NO_MEETING_TYPE } from '@/utils/constants/meeting-types'
import {
  MeetingPermissions,
  MeetingRepeatOptions,
} from '@/utils/constants/schedule'
import { calculateEffectiveDuration } from '@/utils/duration.helper'
import { handleApiError } from '@/utils/error_helper'

type PollGuestScheduleFlowProps = {
  pollData: QuickPollBySlugResponse
  onBack: () => void
}

function PollGuestScheduleFlowInner({
  pollData,
  onBack,
}: PollGuestScheduleFlowProps) {
  const router = useRouter()
  const toast = useToast()
  const queryClient = useQueryClient()
  const { fetchPollCounts } = useContext(MetricStateContext)
  const { currentPage, handlePageSwitch, inviteModalOpen, setInviteModalOpen } =
    useScheduleNavigation()
  const {
    groupAvailability,
    groupParticipants,
    participants,
    setGroupAvailability,
    setGroupParticipants,
    setParticipants,
  } = useParticipants()
  const {
    title,
    content,
    duration,
    durationMode,
    timeRange,
    pickedTime,
    meetingProvider,
    meetingUrl,
    meetingNotification,
    selectedPermissions,
    setTitle,
    setContent,
    setDuration,
    setSelectedPermissions,
    setMeetingRepeat,
    setIsScheduling,
  } = useScheduleState()

  const [isPrefetching, setIsPrefetching] = useState(true)

  const inviteKey = useMemo(
    () =>
      `${Object.values(groupAvailability).flat().length}-${
        Object.values(groupParticipants).flat().length
      }-${participants.length}`,
    [groupAvailability, groupParticipants, participants]
  )

  const effectiveDuration = useMemo(
    () => calculateEffectiveDuration(durationMode, duration, timeRange),
    [durationMode, duration, timeRange]
  )

  useEffect(() => {
    const poll = pollData.poll
    const pollParticipants: ParticipantInfo[] = poll.participants.map(
      participant => {
        const isCurrentUser =
          participant.participant_type === QuickPollParticipantType.SCHEDULER

        return {
          account_address: participant.account_address || '',
          guest_email: participant.guest_email || undefined,
          name: participant.guest_name || participant.guest_email || 'Unknown',
          status:
            participant.status === QuickPollParticipantStatus.ACCEPTED
              ? ParticipationStatus.Accepted
              : ParticipationStatus.Pending,
          type: isCurrentUser
            ? ParticipantType.Scheduler
            : ParticipantType.Invitee,
          slot_id: '',
          meeting_id: '',
        }
      }
    )

    setTitle(poll.title)
    setContent(poll.description || '')
    setDuration(poll.duration_minutes)

    if (poll.permissions && poll.permissions.length > 0) {
      setSelectedPermissions(poll.permissions as MeetingPermissions[])
    }

    const noRepeat = MeetingRepeatOptions[0]
    setMeetingRepeat({
      value: noRepeat.value,
      label: noRepeat.label,
    })

    setParticipants(pollParticipants)
    setIsPrefetching(false)
  }, [
    pollData,
    setTitle,
    setContent,
    setDuration,
    setSelectedPermissions,
    setMeetingRepeat,
    setParticipants,
  ])

  const handleSchedule = useCallback(async () => {
    try {
      setIsScheduling(true)

      if (!pickedTime) {
        toast({
          title: 'No time selected',
          description:
            'Please select a time slot before scheduling the meeting.',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
        setIsScheduling(false)
        return
      }

      if (!title?.trim()) {
        toast({
          title: 'Title required',
          description: 'Please enter a meeting title.',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
        setIsScheduling(false)
        return
      }

      const start = new Date(pickedTime)
      const end = new Date(start)
      end.setMinutes(end.getMinutes() + effectiveDuration)

      await scheduleMeeting(
        true,
        SchedulingType.GUEST,
        NO_MEETING_TYPE,
        start,
        end,
        participants as ParticipantInfo[],
        meetingProvider || MeetingProvider.GOOGLE_MEET,
        null,
        content,
        meetingUrl || undefined,
        undefined,
        title.trim(),
        meetingNotification.map(n => n.value),
        selectedPermissions || [],
        null,
        pollData.poll.id
      )

      queryClient.invalidateQueries({ queryKey: ['quickpoll-public'] })
      queryClient.invalidateQueries({
        queryKey: ['quickpoll-schedule', pollData.poll.id],
      })
      queryClient.invalidateQueries({ queryKey: ['ongoing-quickpolls'] })
      queryClient.invalidateQueries({ queryKey: ['past-quickpolls'] })
      try {
        void fetchPollCounts()
      } catch {}

      handlePageSwitch(Page.COMPLETED)
    } catch (e: unknown) {
      handleApiError('Error scheduling meeting', e as Error)
    } finally {
      setIsScheduling(false)
    }
  }, [
    pickedTime,
    pollData.poll.id,
    title,
    content,
    effectiveDuration,
    participants,
    meetingProvider,
    meetingUrl,
    meetingNotification,
    selectedPermissions,
    toast,
    queryClient,
    fetchPollCounts,
    setIsScheduling,
    handlePageSwitch,
  ])

  const actions: IActionsContext = useMemo(
    () => ({
      handleSchedule,
      handleCancel: onBack,
      handleDelete: async () => {},
    }),
    [handleSchedule, onBack]
  )

  const onGuestPollDone = useCallback(() => {
    const basePath = router.asPath.split('?')[0]
    void router.push(basePath, undefined, { shallow: true })
    onBack()
  }, [router, onBack])

  return (
    <ActionsContext.Provider value={actions}>
      <InviteParticipants
        key={inviteKey}
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        groupAvailability={groupAvailability}
        groupParticipants={groupParticipants}
        participants={participants}
        handleUpdateGroups={(nextGroupAvailability, nextGroupParticipants) => {
          setGroupAvailability(nextGroupAvailability)
          setGroupParticipants(nextGroupParticipants)
        }}
        handleUpdateParticipants={setParticipants}
        isQuickPoll={true}
        pollData={pollData}
        onInviteSuccess={async () => {
          await queryClient.invalidateQueries({
            queryKey: ['quickpoll-public'],
          })
          await queryClient.invalidateQueries({
            queryKey: ['quickpoll-schedule', pollData.poll.id],
          })
          setInviteModalOpen(false)
        }}
      />
      <Container
        maxW={{
          base: '100%',
          '2xl': '100%',
        }}
        mt={10}
        flex={1}
        pb={16}
        px={{
          md: 10,
        }}
      >
        {isPrefetching ? (
          <Flex
            flex={1}
            alignItems="center"
            justifyContent="center"
            w={'100%'}
            h={'100%'}
          >
            <Loading />
          </Flex>
        ) : (
          <Tabs index={currentPage} isLazy>
            <TabPanels>
              <TabPanel p={0} />
              <TabPanel p={0}>
                <ScheduleBase hideMeetingRepeat />
              </TabPanel>
              <TabPanel p={0}>
                <ScheduleCompleted guestPollOnDone={onGuestPollDone} />
              </TabPanel>
            </TabPanels>
          </Tabs>
        )}
      </Container>
    </ActionsContext.Provider>
  )
}

export function PollGuestScheduleFlow(props: PollGuestScheduleFlowProps) {
  return (
    <NavigationProvider
      initialPage={Page.SCHEDULE_DETAILS}
      onRequestScheduleTimePage={props.onBack}
    >
      <PollGuestScheduleFlowInner {...props} />
    </NavigationProvider>
  )
}

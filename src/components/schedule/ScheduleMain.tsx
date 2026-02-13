import {
  Container,
  Flex,
  TabPanel,
  TabPanels,
  Tabs,
  useDisclosure,
  useToast,
} from '@chakra-ui/react'
import { addMinutes, differenceInMinutes } from 'date-fns'
import { useRouter } from 'next/router'
import { FC, useContext, useEffect, useMemo, useState } from 'react'

import Loading from '@/components/Loading'
import QuickPollAvailabilityDiscover from '@/components/quickpoll/QuickPollAvailabilityDiscover'
import { CancelMeetingDialog } from '@/components/schedule/cancel-dialog'
import InviteParticipants from '@/components/schedule/participants/InviteParticipants'
import ScheduleBase from '@/components/schedule/ScheduleBase'
import ScheduleCompleted from '@/components/schedule/ScheduleCompleted'
import ScheduleTimeDiscover from '@/components/schedule/ScheduleTimeDiscover'
import { IInitialProps } from '@/pages/dashboard/schedule'
import { AccountContext } from '@/providers/AccountProvider'
import { MetricStateContext } from '@/providers/MetricStateProvider'
import { QuickPollAvailabilityProvider } from '@/providers/quickpoll/QuickPollAvailabilityContext'
import {
  ActionsContext,
  IActionsContext,
} from '@/providers/schedule/ActionsContext'
import { useScheduleNavigation } from '@/providers/schedule/NavigationContext'
import { useParticipants } from '@/providers/schedule/ParticipantsContext'
import { useParticipantPermissions } from '@/providers/schedule/PermissionsContext'
import { useScheduleState } from '@/providers/schedule/ScheduleContext'
import { EditMode, Intents } from '@/types/Dashboard'
import {
  DBSlot,
  MeetingDecrypted,
  MeetingProvider,
  MeetingRepeat,
  SchedulingType,
  SlotInstance,
} from '@/types/Meeting'
import {
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '@/types/ParticipantInfo'
import {
  PollStatus,
  QuickPollBySlugResponse,
  QuickPollParticipantStatus,
  QuickPollParticipantType,
} from '@/types/QuickPoll'
import { isGroupParticipant } from '@/types/schedule'
import { logEvent } from '@/utils/analytics'
import {
  decodeMeetingGuest,
  getContactById,
  getGroup,
  getGroupMembersAvailabilities,
  getGroupsMembers,
  getMeeting,
  getQuickPollById,
  getSlotByMeetingId,
  getSlotInstanceById,
  updateQuickPoll,
} from '@/utils/api_helper'
import {
  decodeMeeting,
  deleteMeeting,
  deleteMeetingInstance,
  deleteMeetingSeries,
  scheduleMeeting,
  scheduleRecurringMeeting,
  selectDefaultProvider,
  updateMeeting,
  updateMeetingInstance,
  updateMeetingSeries,
} from '@/utils/calendar_manager'
import { NO_GROUP_KEY } from '@/utils/constants/group'
import { UpdateMode } from '@/utils/constants/meeting'
import { NO_MEETING_TYPE } from '@/utils/constants/meeting-types'
import {
  MeetingNotificationOptions,
  MeetingPermissions,
  MeetingRepeatOptions,
} from '@/utils/constants/schedule'
import { calculateEffectiveDuration } from '@/utils/duration.helper'
import { handleApiError } from '@/utils/error_helper'
import {
  GateConditionNotValidError,
  GoogleServiceUnavailable,
  Huddle01ServiceUnavailable,
  InvalidURL,
  MeetingChangeConflictError,
  MeetingCreationError,
  MeetingWithYourselfError,
  MultipleSchedulersError,
  PermissionDenied,
  TimeNotAvailableError,
  UrlCreationError,
  ZoomServiceUnavailable,
} from '@/utils/errors'
import {
  canAccountAccessPermission,
  isAccountSchedulerOrOwner,
} from '@/utils/generic_utils'
import { queryClient } from '@/utils/react_query'
import { getMergedParticipants, parseAccounts } from '@/utils/schedule.helper'
import { getSignature } from '@/utils/storage'

export enum Page {
  SCHEDULE_TIME,
  SCHEDULE_DETAILS,
  COMPLETED,
}

const ScheduleMain: FC<IInitialProps> = ({
  groupId,
  intent,
  meetingId,
  contactId,
  conferenceId,
  pollId,
  seriesId,
}) => {
  const { currentAccount } = useContext(AccountContext)
  const { fetchPollCounts } = useContext(MetricStateContext)
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
    meetingRepeat,
    selectedPermissions,
    setTitle,
    setContent,
    setDuration,
    setPickedTime,
    setMeetingProvider,
    setMeetingUrl,
    setMeetingNotification,
    setMeetingRepeat,
    setSelectedPermissions,
    setIsScheduling,
    decryptedMeeting,
    setDecryptedMeeting,
    editMode,
  } = useScheduleState()
  const {
    addGroup,
    groupAvailability,
    groupParticipants,
    group,
    meetingOwners,
    participants,
    setGroupAvailability,
    setGroupMembersAvailabilities,
    setGroupParticipants,
    setMeetingOwners,
    setParticipants,
    setGroup,
    setIsGroupPrefetching,
  } = useParticipants()
  const { currentPage, handlePageSwitch, setInviteModalOpen, inviteModalOpen } =
    useScheduleNavigation()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const {
    setIsDeleting,
    setCanDelete,
    setCanCancel,
    setIsScheduler,
    setCanEditMeetingDetails,
  } = useParticipantPermissions()
  const [isPrefetching, setIsPrefetching] = useState(true)
  const [pollData, setPollData] = useState<QuickPollBySlugResponse | null>(null)
  const toast = useToast()
  const router = useRouter()
  const { push, query } = router
  const isQuickPollFlow = query.ref === 'quickpoll'

  const handleGroupPrefetch = async () => {
    if (!groupId) return
    try {
      setIsGroupPrefetching(true)
      const [group, fetchedGroupMembers, groupMembersAvailabilitiesData] =
        await Promise.all([
          getGroup(groupId),
          getGroupsMembers(groupId),
          getGroupMembersAvailabilities(groupId),
        ])

      setGroup({
        ...group,
        members: fetchedGroupMembers.filter(member => !!member.address),
      })
      const actualMembers = fetchedGroupMembers
        .filter(val => !val.invitePending)
        .filter(val => !!val.address)
      const allAddresses = actualMembers
        .map(val => val.address)
        .filter((val): val is string => typeof val === 'string')
      if (!(groupParticipants[groupId] || groupAvailability[groupId])) {
        setGroupAvailability(prev => ({
          ...prev,
          [groupId]: allAddresses,
        }))
        setGroupParticipants(prev => ({
          ...prev,
          [groupId]: allAddresses,
        }))
        setGroupMembersAvailabilities(prev => ({
          ...prev,
          [groupId]: groupMembersAvailabilitiesData,
        }))
        addGroup({
          isGroup: true,
          name: group.name,
          id: group.id,
        })
      }
    } catch (error: unknown) {
      handleApiError('Error prefetching group.', error)
    } finally {
      setIsGroupPrefetching(false)
    }
  }
  const handleContactPrefetch = async () => {
    if (!contactId) return
    try {
      const contact = await getContactById(contactId)
      if (contact) {
        const key = NO_GROUP_KEY
        const participant: ParticipantInfo = {
          account_address: contact.address,
          name: contact.name,
          status: ParticipationStatus.Pending,
          type: ParticipantType.Invitee,
          slot_id: '',
          meeting_id: '',
        }
        setParticipants(prev => [...prev, participant])
        const allAddresses = [contact.address]
        if (currentAccount?.address) {
          allAddresses.push(currentAccount?.address)
        }
        setGroupAvailability({
          [key]: allAddresses,
        })
      }
    } catch (error: unknown) {
      handleApiError('Error prefetching contact.', error)
    }
  }

  const handlePollPrefetch = async () => {
    if (!pollId) return
    try {
      const poll = (await getQuickPollById(pollId)) as QuickPollBySlugResponse
      setPollData(poll)
      setTitle(poll.poll.title)
      setContent(poll.poll.description)
      setDuration(poll.poll.duration_minutes)

      if (poll.poll.permissions && poll.poll.permissions.length > 0) {
        setSelectedPermissions(poll.poll.permissions as MeetingPermissions[])
      }

      const currentAddress = currentAccount?.address?.toLowerCase()
      const pollParticipants: ParticipantInfo[] = poll.poll.participants.map(
        participant => {
          const isCurrentUser =
            !!currentAddress &&
            (participant.account_address?.toLowerCase() === currentAddress ||
              participant.guest_email?.toLowerCase() === currentAddress)
          return {
            account_address: participant.account_address || '',
            name:
              participant.guest_name || participant.guest_email || 'Unknown',
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

      setParticipants(pollParticipants)
      setIsScheduler(true)
    } catch (error: unknown) {
      handleApiError('Error prefetching poll.', error)
    }
  }

  const handleFetchMeetingInformation = async () => {
    if (!meetingId && !conferenceId) return
    try {
      let decryptedMeeting: MeetingDecrypted | null = null
      let actor = ''
      if (meetingId) {
        let slot: DBSlot | SlotInstance | null
        if (meetingId.includes('_')) {
          slot = await getSlotInstanceById(meetingId)
        } else {
          slot = await getMeeting(meetingId)
        }
        if (!slot) {
          toast({
            title: 'Meeting Not Found',
            description: `The meeting you are trying to access does not exist or has been deleted.`,
            status: 'error',
            duration: 15000,
            position: 'top',
            isClosable: true,
            onCloseComplete: () => push(`/dashboard/${EditMode.MEETINGS}`),
          })
          return
        }
        decryptedMeeting = await decodeMeeting(slot, currentAccount!)
        actor = slot.account_address || ''
      } else if (conferenceId) {
        const slot = await getSlotByMeetingId(conferenceId)
        if (slot?.user_type === 'account') {
          decryptedMeeting = await decodeMeeting(slot, currentAccount!)
          actor = slot.account_address!
        } else if (slot?.user_type === 'guest') {
          decryptedMeeting = await decodeMeetingGuest(slot)
          actor = slot.guest_email || ''
        }
      }
      if (!decryptedMeeting) {
        toast({
          title: 'Meeting Access Denied',
          description: `You don't have permission to view this meeting. Please log in with account ${actor} or ask the meeting organizer to grant you access.`,
          status: 'error',
          duration: 15000,
          position: 'top',
          isClosable: true,
          onCloseComplete: () => push(`/dashboard/${EditMode.MEETINGS}`),
        })
        return
      }
      setDecryptedMeeting(decryptedMeeting)
      const participants = decryptedMeeting.participants
      const scheduler = participants.find(
        val => val.type === ParticipantType.Scheduler
      )
      const isCurrentUserScheduler =
        scheduler?.account_address === currentAccount?.address
      setIsScheduler(isCurrentUserScheduler)

      if (participants.length === 2) {
        setCanDelete(false)
      } else {
        setCanDelete(true)
      }
      const allAddresses = participants
        .map(val => val.account_address)
        .filter(value => Boolean(value)) as string[]
      setGroupAvailability({
        [NO_GROUP_KEY]: allAddresses,
      })
      const diffInMinutes = differenceInMinutes(
        decryptedMeeting.end,
        decryptedMeeting.start
      )
      setParticipants(participants)

      setTitle(decryptedMeeting.title || '')
      setContent(decryptedMeeting.content || '')
      setDuration(diffInMinutes)
      setPickedTime(decryptedMeeting.start)
      setMeetingProvider(
        decryptedMeeting.provider ||
          selectDefaultProvider(currentAccount?.preferences.meetingProviders)
      )

      setSelectedPermissions(decryptedMeeting.permissions || undefined)

      const isSchedulerOrOwner = isAccountSchedulerOrOwner(
        decryptedMeeting?.participants,
        currentAccount?.address
      )
      if (isSchedulerOrOwner) {
        setCanCancel(true)
      } else {
        setCanCancel(false)
      }
      if (decryptedMeeting.permissions) {
        const canEditMeetingDetails = canAccountAccessPermission(
          decryptedMeeting?.permissions,
          decryptedMeeting?.participants || [],
          currentAccount?.address,
          MeetingPermissions.EDIT_MEETING
        )
        setCanEditMeetingDetails(canEditMeetingDetails)
        const canViewParticipants = canAccountAccessPermission(
          decryptedMeeting?.permissions,
          decryptedMeeting?.participants || [],
          currentAccount?.address,
          MeetingPermissions.SEE_GUEST_LIST
        )
        if (!canViewParticipants) {
          setParticipants(
            participants.map(p => {
              delete p.isHidden
              if (
                p.type === ParticipantType.Scheduler ||
                p.account_address === currentAccount?.address
              ) {
                return p
              } else {
                return {
                  ...p,
                  isHidden: true,
                }
              }
            })
          )
        }
      }
      setMeetingUrl(decryptedMeeting.meeting_url)
      const meetingOwners = decryptedMeeting.participants?.filter(
        val => val.type === ParticipantType.Owner
      )
      setMeetingOwners(meetingOwners)
      setMeetingNotification(
        decryptedMeeting.reminders?.map(val => {
          const option = MeetingNotificationOptions.find(
            opt => opt.value === val
          )
          return {
            value: val,
            label: option?.label,
          }
        }) || []
      )
      setMeetingRepeat(
        decryptedMeeting.recurrence
          ? {
              value: decryptedMeeting.recurrence,
              label:
                MeetingRepeatOptions.find(
                  val => val.value === decryptedMeeting.recurrence
                )?.label || '',
            }
          : {
              value: MeetingRepeat['NO_REPEAT'],
              label: 'Does not repeat',
            }
      )
      if (intent === Intents.CANCEL_MEETING) {
        onOpen()
      }
      handlePageSwitch(Page.SCHEDULE_DETAILS)
    } catch (error: unknown) {
      handleApiError('Error fetching meeting information.', error)
    }
  }
  const handlePrefetch = async () => {
    setIsPrefetching(true)
    const promises = []
    if (contactId) {
      promises.push(handleContactPrefetch())
    }
    if (groupId) {
      promises.push(handleGroupPrefetch())
    }
    if (pollId) {
      promises.push(handlePollPrefetch())
    }
    if (meetingId || conferenceId || seriesId) {
      promises.push(handleFetchMeetingInformation())
    }
    if (promises.length === 0) {
      setGroupAvailability(prev => ({
        ...prev,
        [NO_GROUP_KEY]: [currentAccount?.address || ''],
      }))
      setGroupParticipants(prev => ({
        ...prev,
        [NO_GROUP_KEY]: [currentAccount?.address || ''],
      }))
    }
    await Promise.all(promises)
    setIsPrefetching(false)
  }
  useEffect(() => {
    void handlePrefetch()
  }, [
    groupId,
    contactId,
    intent,
    meetingId,
    conferenceId,
    currentAccount?.address,
    seriesId,
  ])

  useEffect(() => {
    const selectedTimeParam = query.selectedTime as string
    if (selectedTimeParam && router.isReady) {
      try {
        const selectedTime = new Date(decodeURIComponent(selectedTimeParam))
        if (!isNaN(selectedTime.getTime())) {
          setPickedTime(selectedTime)
        }
      } catch (error) {
        console.warn('Failed to parse selectedTime from URL:', error)
      }
    }
  }, [query.selectedTime, router.isReady, setPickedTime])

  const handleDelete = async (actor?: ParticipantInfo) => {
    if (!decryptedMeeting) return
    setIsDeleting(true)
    try {
      if (seriesId) {
        if (editMode === UpdateMode.SINGLE_EVENT) {
          await deleteMeetingInstance(
            decryptedMeeting.id,
            currentAccount?.address || '',
            decryptedMeeting,
            actor
          )
        } else {
          await deleteMeetingSeries(
            decryptedMeeting.id,
            currentAccount?.address || '',
            actor
          )
        }
      } else {
        await deleteMeeting(
          true,
          currentAccount?.address || '',
          NO_MEETING_TYPE,
          decryptedMeeting,
          actor
        )
      }
      toast({
        title: 'Meeting Deleted',
        description: 'The meeting was deleted successfully',
        status: 'success',
        duration: 5000,
        position: 'top',
        isClosable: true,
      })
      push(`/dashboard/${EditMode.MEETINGS}`)
    } catch (e: unknown) {
      if (e instanceof MeetingWithYourselfError) {
        toast({
          title: "Ops! Can't do that",
          description: e.message,
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof TimeNotAvailableError) {
        toast({
          title: 'Failed to delete meeting',
          description: 'The selected time is not available anymore',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof GateConditionNotValidError) {
        toast({
          title: 'Failed to delete meeting',
          description: e.message,
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof MeetingCreationError) {
        toast({
          title: 'Failed to delete meeting',
          description:
            'A meeting requires at least two participants. Please add more participants to schedule the meeting.',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof MultipleSchedulersError) {
        toast({
          title: 'Failed to delete meeting',
          description: 'A meeting must have only one scheduler',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof MultipleSchedulersError) {
        toast({
          title: 'Failed to delete meeting',
          description: 'A meeting must have only one scheduler',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof MeetingChangeConflictError) {
        toast({
          title: 'Failed to delete meeting',
          description:
            'Someone else has updated this meeting. Please reload and try again.',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof InvalidURL) {
        toast({
          title: 'Failed to delete meeting',
          description: 'Please provide a valid url/link for your meeting.',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof Huddle01ServiceUnavailable) {
        toast({
          title: 'Failed to create video meeting',
          description:
            'Huddle01 seems to be offline. Please select a custom meeting link, or try again.',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof ZoomServiceUnavailable) {
        toast({
          title: 'Failed to create video meeting',
          description:
            'Zoom seems to be offline. Please select a different meeting location, or try again.',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof GoogleServiceUnavailable) {
        toast({
          title: 'Failed to create video meeting',
          description:
            'Google seems to be offline. Please select a different meeting location, or try again.',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof UrlCreationError) {
        toast({
          title: 'Failed to delete meeting',
          description:
            'There was an issue generating a meeting url for your meeting. try using a different location',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else {
        handleApiError('Error deleting meeting', e)
      }
    }
    setIsDeleting(false)
  }

  const effectiveDuration = useMemo(
    () => calculateEffectiveDuration(durationMode, duration, timeRange),
    [durationMode, duration, timeRange]
  )

  const handleSchedule = async () => {
    try {
      setIsScheduling(true)

      // Handle quickpoll scheduling
      if (pollId && pollData) {
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

        const start = new Date(pickedTime)
        const end = addMinutes(new Date(start), effectiveDuration)

        // Get quickpoll participants
        const quickpollParticipants = pollData.poll.participants.map(
          participant => ({
            account_address: participant.account_address || undefined,
            guest_email: participant.guest_email || undefined,
            name:
              participant.guest_name || participant.guest_email || 'Unknown',
            status: ParticipationStatus.Pending,
            type:
              participant.participant_type ===
              QuickPollParticipantType.SCHEDULER
                ? ParticipantType.Scheduler
                : ParticipantType.Invitee,
            slot_id: '',
            meeting_id: '',
          })
        )
        if (meetingRepeat.value != MeetingRepeat.NO_REPEAT) {
          await scheduleRecurringMeeting(
            start,
            end,
            quickpollParticipants,
            meetingRepeat.value,
            meetingProvider || MeetingProvider.GOOGLE_MEET,
            currentAccount,
            content,
            meetingUrl,
            title,
            meetingNotification.map(n => n.value),
            selectedPermissions
          )
        } else {
          await scheduleMeeting(
            true,
            SchedulingType.REGULAR,
            NO_MEETING_TYPE,
            start,
            end,
            quickpollParticipants,
            meetingProvider || MeetingProvider.GOOGLE_MEET,
            currentAccount,
            content,
            meetingUrl,
            undefined,
            title,
            meetingNotification.map(n => n.value),
            selectedPermissions
          )
        }
        try {
          await updateQuickPoll(pollId, { status: PollStatus.COMPLETED })

          queryClient.invalidateQueries({ queryKey: ['ongoing-quickpolls'] })
          queryClient.invalidateQueries({ queryKey: ['past-quickpolls'] })
          queryClient.invalidateQueries({
            queryKey: ['quickpoll-schedule', pollId],
          })
          queryClient.invalidateQueries({ queryKey: ['quickpoll-public'] })
          void fetchPollCounts()
        } catch (error) {
          handleApiError('Failed to update poll status:', error)
        }

        handlePageSwitch(Page.COMPLETED)
        return
      }

      // Regular meeting scheduling flow
      const canViewParticipants = canAccountAccessPermission(
        decryptedMeeting?.permissions,
        decryptedMeeting?.participants || [],
        currentAccount?.address,
        MeetingPermissions.SEE_GUEST_LIST
      )
      const actualParticipants = canViewParticipants
        ? participants
        : participants
            .filter(p => {
              if (isGroupParticipant(p)) return true
              return !p.isHidden
            })
            .concat(decryptedMeeting?.participants || [])
      const allParticipants = getMergedParticipants(
        actualParticipants,
        groupParticipants,
        group
      )
        // we first need to remove all the owners
        .map(participant => {
          return {
            ...participant,
            type:
              participant.type === ParticipantType.Owner
                ? ParticipantType.Invitee
                : participant.type,
          }
        })
        .map(val => {
          if (
            meetingOwners.some(
              owner => owner.account_address === val.account_address
            )
          ) {
            return { ...val, type: ParticipantType.Owner }
          }
          return val
        })
      const _participants = await parseAccounts(allParticipants)

      if (_participants.invalid.length > 0) {
        toast({
          title: 'Invalid invitees',
          description: `Can't invite ${_participants.invalid.join(
            ', '
          )}. Please check the addresses/profiles/emails`,
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
        setIsScheduling(false)
        return
      }
      if (!pickedTime) return
      const start = new Date(pickedTime)
      const end = addMinutes(new Date(start), effectiveDuration)

      const canUpdateOtherGuests = canAccountAccessPermission(
        decryptedMeeting?.permissions,
        decryptedMeeting?.participants || [],
        currentAccount?.address,
        MeetingPermissions.INVITE_GUESTS
      )
      if (
        !canUpdateOtherGuests &&
        decryptedMeeting?.participants?.length !== _participants.valid.length
      ) {
        toast({
          title: 'Permission Denied',
          description: 'You do not have permission to update other guests.',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
        setIsScheduling(false)
        return
      }
      if (
        (meetingId || conferenceId) &&
        intent === Intents.UPDATE_MEETING &&
        decryptedMeeting
      ) {
        if (seriesId) {
          if (editMode === UpdateMode.SINGLE_EVENT) {
            await updateMeetingInstance(
              decryptedMeeting.id,
              currentAccount!.address,
              start,
              end,
              decryptedMeeting!,
              getSignature(currentAccount!.address) || '',
              _participants.valid,
              content,
              meetingUrl,
              meetingProvider,
              title,
              meetingNotification.map(mn => mn.value),
              selectedPermissions
            )
          } else {
            await updateMeetingSeries(
              decryptedMeeting.id,
              currentAccount!.address,
              start,
              end,
              getSignature(currentAccount!.address) || '',
              _participants.valid,
              content,
              meetingUrl,
              meetingProvider,
              title,
              meetingNotification.map(mn => mn.value),
              selectedPermissions
            )
          }
        } else {
          await updateMeeting(
            true,
            currentAccount!.address,
            NO_MEETING_TYPE,
            start,
            end,
            decryptedMeeting!,
            getSignature(currentAccount!.address) || '',
            _participants.valid,
            content,
            meetingUrl,
            meetingProvider,
            title,
            meetingNotification.map(mn => mn.value),
            meetingRepeat.value,
            selectedPermissions
          )
          logEvent('Updated a meeting', {
            fromDashboard: true,
            participantsSize: _participants.valid.length,
          })
        }
      } else {
        if (meetingRepeat.value != MeetingRepeat.NO_REPEAT) {
          await scheduleRecurringMeeting(
            start,
            end,
            _participants.valid,
            meetingRepeat.value,
            meetingProvider || MeetingProvider.GOOGLE_MEET,
            currentAccount,
            content,
            meetingUrl,
            title,
            meetingNotification.map(n => n.value),
            selectedPermissions
          )
        } else {
          await scheduleMeeting(
            true,
            SchedulingType.REGULAR,
            NO_MEETING_TYPE,
            start,
            end,
            _participants.valid,
            meetingProvider || MeetingProvider.GOOGLE_MEET,
            currentAccount,
            content,
            meetingUrl,
            undefined,
            title,
            meetingNotification.map(n => n.value),
            selectedPermissions
          )
        }
      }
      handlePageSwitch(Page.COMPLETED)
    } catch (e: unknown) {
      if (e instanceof MeetingWithYourselfError) {
        toast({
          title: "Ops! Can't do that",
          description: e.message,
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof TimeNotAvailableError) {
        toast({
          title: 'Failed to schedule meeting',
          description: 'The selected time is not available anymore',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof GateConditionNotValidError) {
        toast({
          title: 'Failed to schedule meeting',
          description: e.message,
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof MeetingCreationError) {
        toast({
          title: 'Failed to schedule meeting',
          description:
            'There was an issue scheduling your meeting. Please get in touch with us through support@meetwithwallet.xyz',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof MultipleSchedulersError) {
        toast({
          title: 'Failed to schedule meeting',
          description: 'A meeting must have only one scheduler',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof MeetingChangeConflictError) {
        toast({
          title: 'Failed to update meeting',
          description:
            'Someone else has updated this meeting. Please reload and try again.',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof InvalidURL) {
        toast({
          title: 'Failed to schedule meeting',
          description: 'Please provide a valid url/link for your meeting.',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof Huddle01ServiceUnavailable) {
        toast({
          title: 'Failed to create video meeting',
          description:
            'Huddle01 seems to be offline. Please select a custom meeting link, or try again.',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof ZoomServiceUnavailable) {
        toast({
          title: 'Failed to create video meeting',
          description:
            'Zoom seems to be offline. Please select a different meeting location, or try again.',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof GoogleServiceUnavailable) {
        toast({
          title: 'Failed to create video meeting',
          description:
            'Google seems to be offline. Please select a different meeting location, or try again.',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof UrlCreationError) {
        toast({
          title: 'Failed to schedule meeting',
          description:
            'There was an issue generating a meeting url for your meeting. try using a different location',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof PermissionDenied) {
        toast({
          title: 'Permission Denied',
          description: e.message,
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else {
        handleApiError('Error scheduling meeting', e as Error)
      }
    } finally {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      queryClient.invalidateQueries({ queryKey: ['meeting'] })
      setIsScheduling(false)
    }
  }
  const handleRedirect = () => push(`/dashboard/${EditMode.MEETINGS}`)
  const handleCancel = () => onOpen()

  const context: IActionsContext = {
    handleCancel,
    handleDelete,
    handleSchedule,
  }
  const inviteKey = useMemo(
    () =>
      `${Object.values(groupAvailability).flat().length}-${
        Object.values(groupParticipants).flat().length
      }-${participants.length}`,
    [groupAvailability, groupParticipants, participants]
  )

  return (
    <ActionsContext.Provider value={context}>
      <InviteParticipants
        key={inviteKey}
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
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
              <TabPanel p={0}>
                {isQuickPollFlow && pollId ? (
                  <QuickPollAvailabilityProvider>
                    <QuickPollAvailabilityDiscover pollId={pollId} />
                  </QuickPollAvailabilityProvider>
                ) : (
                  <ScheduleTimeDiscover />
                )}
              </TabPanel>
              <TabPanel p={0}>
                <ScheduleBase />
              </TabPanel>
              <TabPanel p={0}>
                <ScheduleCompleted />
              </TabPanel>
            </TabPanels>
          </Tabs>
        )}
        <CancelMeetingDialog
          isOpen={isOpen}
          onClose={onClose}
          decryptedMeeting={decryptedMeeting}
          currentAccount={currentAccount}
          afterCancel={handleRedirect}
          editMode={editMode}
        />
      </Container>
    </ActionsContext.Provider>
  )
}

export default ScheduleMain

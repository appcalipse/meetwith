import { Container, Flex, useDisclosure, useToast } from '@chakra-ui/react'
import { addMinutes, differenceInMinutes } from 'date-fns'
import { zonedTimeToUtc } from 'date-fns-tz'
import { NextPage } from 'next'
import { useRouter } from 'next/router'
import React, { useContext, useEffect, useState } from 'react'

import Loading from '@/components/Loading'
import { CancelMeetingDialog } from '@/components/schedule/cancel-dialog'
import ScheduleBase from '@/components/schedule/ScheduleBase'
import ScheduleCompleted from '@/components/schedule/ScheduleCompleted'
import ScheduleDetails from '@/components/schedule/ScheduleDetails'
import ScheduleTimeDiscover from '@/components/schedule/ScheduleTimeDiscover'
import { AccountContext } from '@/providers/AccountProvider'
import { forceAuthenticationCheck } from '@/session/forceAuthenticationCheck'
import { withLoginRedirect } from '@/session/requireAuthentication'
import { MeetingReminders } from '@/types/common'
import { EditMode, Intents } from '@/types/Dashboard'
import { GetGroupsFullResponse } from '@/types/Group'
import {
  MeetingDecrypted,
  MeetingProvider,
  MeetingRepeat,
  SchedulingType,
} from '@/types/Meeting'
import {
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '@/types/ParticipantInfo'
import {
  IGroupParticipant,
  isGroupParticipant,
  Participant,
} from '@/types/schedule'
import { logEvent } from '@/utils/analytics'
import {
  getGroup,
  getGroupsFull,
  getGroupsMembers,
  getMeeting,
} from '@/utils/api_helper'
import {
  decodeMeeting,
  deleteMeeting,
  scheduleMeeting,
  selectDefaultProvider,
  updateMeeting,
} from '@/utils/calendar_manager'
import {
  MeetingNotificationOptions,
  MeetingPermissions,
  MeetingRepeatOptions,
} from '@/utils/constants/schedule'
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
import { getMergedParticipants, parseAccounts } from '@/utils/schedule.helper'
import { getSignature } from '@/utils/storage'
import { getAllParticipantsDisplayName } from '@/utils/user_manager'

export enum Page {
  SCHEDULE,
  SCHEDULE_TIME,
  SCHEDULE_DETAILS,
  COMPLETED,
}

// TODO: prevent members list from being seen if the see_guest_list option is not toggled
// Hide members from UI and email
// Figure out a way to hide and show participants on invite list
// TODO: work on the make other participant meeting owner logic
interface IScheduleContext {
  groupParticipants: Record<string, Array<string>>
  groupAvailability: Record<string, Array<string>>
  setGroupParticipants: React.Dispatch<
    React.SetStateAction<Record<string, Array<string>>>
  >
  setGroupAvailability: React.Dispatch<
    React.SetStateAction<Record<string, Array<string>>>
  >
  addGroup: (group: IGroupParticipant) => void
  removeGroup: (groupId: string) => void
  participants: Array<Participant>
  handlePageSwitch: (page: Page) => void
  setParticipants: React.Dispatch<React.SetStateAction<Array<Participant>>>
  title: string
  content: string
  duration: number
  handleTitleChange: (title: string) => void
  handleContentChange: (content: string) => void
  handleDurationChange: (duration: number) => void
  pickedTime: Date | number | null
  handleTimePick: (time: Date | number) => void
  currentMonth: Date
  setCurrentMonth: React.Dispatch<React.SetStateAction<Date>>
  timezone: string
  setTimezone: React.Dispatch<React.SetStateAction<string>>
  handleSchedule: () => void
  handleCancel: () => void
  isScheduling: boolean
  meetingProvider: MeetingProvider
  setMeetingProvider: React.Dispatch<React.SetStateAction<MeetingProvider>>
  meetingUrl?: string
  setMeetingUrl: React.Dispatch<React.SetStateAction<string>>
  currentSelectedDate: Date
  setCurrentSelectedDate: React.Dispatch<React.SetStateAction<Date>>
  meetingNotification: Array<{
    value: MeetingReminders
    label?: string
  }>
  setMeetingNotification: React.Dispatch<
    React.SetStateAction<
      Array<{
        value: MeetingReminders
        label?: string
      }>
    >
  >
  meetingRepeat: {
    value: MeetingRepeat
    label: string
  }
  setMeetingRepeat: React.Dispatch<
    React.SetStateAction<{
      value: MeetingRepeat
      label: string
    }>
  >
  groups: Array<GetGroupsFullResponse>
  isGroupPrefetching: boolean
  handleDelete: (scheduler?: ParticipantInfo) => void
  isDeleting: boolean
  canDelete: boolean
  isScheduler: boolean
  selectedPermissions: Array<MeetingPermissions> | undefined
  setSelectedPermissions: React.Dispatch<
    React.SetStateAction<Array<MeetingPermissions> | undefined>
  >
  meetingOwners: Array<ParticipantInfo>
  setMeetingOwners: React.Dispatch<React.SetStateAction<Array<ParticipantInfo>>>
  canEditMeetingDetails: boolean
  setCanEditMeetingDetails: React.Dispatch<React.SetStateAction<boolean>>
}

const DEFAULT_CONTEXT: IScheduleContext = {
  handlePageSwitch: () => {},
  groupParticipants: {},
  groupAvailability: {},
  setGroupParticipants: () => {},
  setGroupAvailability: () => {},
  addGroup: () => {},
  removeGroup: () => {},
  participants: [],
  setParticipants: () => {},
  title: '',
  content: '',
  duration: 30,
  handleTitleChange: () => {},
  handleContentChange: () => {},
  handleDurationChange: () => {},
  pickedTime: null,
  handleTimePick: () => {},
  currentMonth: new Date(),
  setCurrentMonth: () => {},
  timezone: '',
  setTimezone: () => {},
  handleSchedule: () => {},
  handleDelete: () => {},
  handleCancel: () => {},
  isScheduling: false,
  meetingProvider: MeetingProvider.HUDDLE,
  setMeetingProvider: () => {},
  meetingUrl: '',
  setMeetingUrl: () => {},
  currentSelectedDate: new Date(),
  setCurrentSelectedDate: () => {},
  meetingNotification: [],
  setMeetingNotification: () => {},
  meetingRepeat: {
    value: MeetingRepeat.NO_REPEAT,
    label: 'Does not repeat',
  },
  setMeetingRepeat: () => {},
  groups: [],
  isGroupPrefetching: false,
  isDeleting: false,
  canDelete: false,
  isScheduler: false,
  selectedPermissions: [MeetingPermissions.SEE_GUEST_LIST],
  setSelectedPermissions: () => {},
  meetingOwners: [],
  setMeetingOwners: () => {},
  canEditMeetingDetails: false,
  setCanEditMeetingDetails: () => {},
}
export const ScheduleContext =
  React.createContext<IScheduleContext>(DEFAULT_CONTEXT)
interface IInitialProps {
  groupId: string
  intent: Intents
  meetingId: string
  contactId: string
}
const Schedule: NextPage<IInitialProps> = ({
  groupId,
  intent,
  meetingId,
  contactId,
}) => {
  const { currentAccount } = useContext(AccountContext)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [participants, setParticipants] = useState<
    Array<ParticipantInfo | IGroupParticipant>
  >([])
  const [groupParticipants, setGroupParticipants] = useState<
    Record<string, Array<string>>
  >({})
  const [groupAvailability, setGroupAvailability] = useState<
    Record<string, Array<string>>
  >({})
  const [currentPage, setCurrentPage] = useState<Page>(Page.SCHEDULE)
  const [title, setTitle] = React.useState('')
  const [content, setContent] = useState('')
  const [duration, setDuration] = React.useState(30)
  const [pickedTime, setPickedTime] = useState<Date | number | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [isPrefetching, setIsPrefetching] = useState(false)
  const [currentSelectedDate, setCurrentSelectedDate] = useState(new Date())
  const [isDeleting, setIsDeleting] = useState(false)
  const [timezone, setTimezone] = useState<string>(
    currentAccount?.preferences?.timezone ??
      Intl.DateTimeFormat().resolvedOptions().timeZone
  )
  const [meetingProvider, setMeetingProvider] = useState<MeetingProvider>(
    selectDefaultProvider(currentAccount?.preferences.meetingProviders)
  )
  const [meetingUrl, setMeetingUrl] = useState('')
  const [decryptedMeeting, setDecryptedMeeting] = useState<
    MeetingDecrypted | undefined
  >(undefined)
  const toast = useToast()
  const [canDelete, setCanDelete] = useState(true)
  const [isScheduler, setIsScheduler] = useState(true)
  const [meetingOwners, setMeetingOwners] = useState<Array<ParticipantInfo>>([])
  const router = useRouter()
  const { push } = router

  const [isScheduling, setIsScheduling] = useState(false)
  const [meetingNotification, setMeetingNotification] = useState<
    Array<{
      value: MeetingReminders
      label?: string
    }>
  >([])
  const [meetingRepeat, setMeetingRepeat] = useState({
    value: MeetingRepeat['NO_REPEAT'],
    label: 'Does not repeat',
  })
  const [selectedPermissions, setSelectedPermissions] = useState<
    Array<MeetingPermissions> | undefined
  >([MeetingPermissions.SEE_GUEST_LIST])
  const [groups, setGroups] = useState<Array<GetGroupsFullResponse>>([])
  const [isGroupPrefetching, setIsGroupPrefetching] = useState(false)
  const [canEditMeetingDetails, setCanEditMeetingDetails] = useState(true)
  const fetchGroups = async () => {
    setIsGroupPrefetching(true)
    try {
      const fetchedGroups = await getGroupsFull(undefined, undefined)
      setGroups(fetchedGroups)
    } catch (error) {
      handleApiError('Error fetching groups.', error as Error)
    } finally {
      setIsGroupPrefetching(false)
    }
  }

  useEffect(() => {
    void fetchGroups()
  }, [])
  const handleTimePick = (time: Date | number) => setPickedTime(time)
  const handleAddGroup = (group: IGroupParticipant) => {
    setParticipants(prev => {
      const groupAdded = prev.some(val => {
        if (isGroupParticipant(val)) {
          return val.isGroup && val.id === group.id
        }
        return false
      })
      if (groupAdded) {
        return prev
      }
      return [...prev, group]
    })
  }
  const handleRemoveGroup = (groupId: string) => {
    setParticipants(prev =>
      prev.filter(val => {
        if (isGroupParticipant(val)) {
          return val.id !== groupId
        }
        return true
      })
    )
    setGroupAvailability(prev => {
      const newGroupAvailability = { ...prev }
      delete newGroupAvailability[groupId]
      return newGroupAvailability
    })

    setGroupParticipants(prev => {
      const newGroupParticipants = { ...prev }
      delete newGroupParticipants[groupId]
      return newGroupParticipants
    })
  }
  const renderCurrentPage = () => {
    switch (currentPage) {
      case Page.SCHEDULE:
        return <ScheduleBase />
      case Page.SCHEDULE_TIME:
        return <ScheduleTimeDiscover />
      case Page.SCHEDULE_DETAILS:
        return <ScheduleDetails />
      case Page.COMPLETED:
        return <ScheduleCompleted />
    }
  }

  const handleDelete = async (scheduler?: ParticipantInfo) => {
    if (!decryptedMeeting) return
    setIsDeleting(true)
    try {
      await deleteMeeting(
        true,
        currentAccount?.address || '',
        'no_type',
        decryptedMeeting?.start,
        decryptedMeeting?.end,
        decryptedMeeting,
        getSignature(currentAccount?.address || '') || '',
        scheduler
      )
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

  const handleSchedule = async () => {
    try {
      setIsScheduling(true)
      const isSchedulerOrOwner = [
        ParticipantType.Scheduler,
        ParticipantType.Owner,
      ].includes(
        decryptedMeeting?.participants?.find(
          p => p.account_address === currentAccount?.address
        )?.type || ParticipantType?.Invitee
      )
      const canViewParticipants =
        decryptedMeeting?.permissions?.includes(
          MeetingPermissions.SEE_GUEST_LIST
        ) ||
        decryptedMeeting?.permissions === undefined ||
        isSchedulerOrOwner
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
        groups,
        groupParticipants,
        currentAccount?.address || ''
      ).map(val => ({
        ...val,
        type: meetingOwners.some(
          owner => owner.account_address === val.account_address
        )
          ? ParticipantType.Owner
          : val.type,
      }))
      const _participants = await parseAccounts(allParticipants)
      const individualParticipants = actualParticipants.filter(
        (val): val is ParticipantInfo => !isGroupParticipant(val)
      )
      const userData = individualParticipants.find(
        val => val.account_address === currentAccount?.address
      )
      if (userData) {
        _participants.valid.push(userData)
      } else {
        _participants.valid.push({
          account_address: currentAccount?.address,
          type: ParticipantType.Scheduler,
          status: ParticipationStatus.Accepted,
          slot_id: '',
          meeting_id: '',
        })
      }
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
      const end = addMinutes(new Date(start), duration)

      const canUpdateOtherGuests =
        decryptedMeeting?.permissions === undefined ||
        !!decryptedMeeting?.permissions?.includes(
          MeetingPermissions.INVITE_GUESTS
        ) ||
        isSchedulerOrOwner

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
      if (meetingId && intent === Intents.UPDATE_MEETING) {
        await updateMeeting(
          true,
          currentAccount!.address,
          'no_type',
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
      } else {
        await scheduleMeeting(
          true,
          SchedulingType.REGULAR,
          'no_type',
          start,
          end,
          _participants.valid,
          meetingProvider || MeetingProvider.HUDDLE,
          currentAccount,
          content,
          meetingUrl,
          undefined,
          title,
          meetingNotification.map(n => n.value),
          meetingRepeat.value,
          selectedPermissions
        )
      }
      setCurrentPage(Page.COMPLETED)
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
    }
    setIsScheduling(false)
  }
  const handleRedirect = () => push(`/dashboard/${EditMode.MEETINGS}`)
  const handleCancel = () => onOpen()
  const context: IScheduleContext = {
    groupParticipants,
    groupAvailability,
    setGroupParticipants,
    setGroupAvailability,
    participants,
    addGroup: handleAddGroup,
    removeGroup: handleRemoveGroup,
    handlePageSwitch: (page: Page) => setCurrentPage(page),
    setParticipants,
    title,
    content,
    duration,
    handleTitleChange: setTitle,
    handleContentChange: setContent,
    handleDurationChange: (val: number) => val && setDuration(val),
    pickedTime,
    handleTimePick,
    currentMonth,
    setCurrentMonth,
    timezone,
    setTimezone,
    handleSchedule,
    isScheduling,
    meetingProvider,
    setMeetingProvider,
    meetingUrl,
    setMeetingUrl,
    currentSelectedDate,
    setCurrentSelectedDate,
    meetingNotification,
    setMeetingNotification,
    meetingRepeat,
    setMeetingRepeat,
    handleCancel,
    groups,
    isGroupPrefetching,
    handleDelete,
    isDeleting,
    canDelete,
    isScheduler,
    selectedPermissions,
    setSelectedPermissions,
    meetingOwners,
    setMeetingOwners,
    canEditMeetingDetails,
    setCanEditMeetingDetails,
  }
  const handleGroupPrefetch = async () => {
    if (!groupId) return
    setIsPrefetching(true)
    try {
      const group = await getGroup(groupId)
      const fetchedGroupMembers = await getGroupsMembers(groupId)
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
        handleAddGroup({
          isGroup: true,
          name: group.name,
          id: group.id,
        })
      }
    } catch (error: unknown) {
      handleApiError('Error prefetching group.', error)
    }
    setIsPrefetching(false)
  }
  const handleContactPrefetch = async () => {}
  const handlePrefetch = async () => {
    setIsPrefetching(true)
    if (contactId) {
      await handleContactPrefetch()
    }
    if (groupId) {
      await handleGroupPrefetch()
    }
    setIsPrefetching(false)
  }
  useEffect(() => {
    if (groupId) {
      void handleGroupPrefetch()
    }
  }, [groupId])
  const handleFetchMeetingInformation = async () => {
    if (!meetingId) return
    setIsPrefetching(true)
    try {
      const meeting = await getMeeting(meetingId)
      const decryptedMeeting = await decodeMeeting(meeting, currentAccount!)
      if (!decryptedMeeting) {
        setIsPrefetching(false)
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
        no_group: allAddresses,
      })
      const start = zonedTimeToUtc(meeting.start, timezone)
      const end = zonedTimeToUtc(meeting.end, timezone)
      const diffInMinutes = differenceInMinutes(end, start)
      setParticipants(participants)

      setTitle(decryptedMeeting.title || '')
      setContent(decryptedMeeting.content || '')
      setDuration(diffInMinutes)
      setPickedTime(start)
      setMeetingProvider(
        decryptedMeeting.provider ||
          selectDefaultProvider(currentAccount?.preferences.meetingProviders)
      )

      setSelectedPermissions(decryptedMeeting.permissions || undefined)

      if (decryptedMeeting.permissions) {
        const isSchedulerOrOwner = [
          ParticipantType.Scheduler,
          ParticipantType.Owner,
        ].includes(
          decryptedMeeting?.participants?.find(
            p => p.account_address === currentAccount?.address
          )?.type || ParticipantType?.Invitee
        )
        const canEditMeetingDetails =
          !!decryptedMeeting?.permissions?.includes(
            MeetingPermissions.EDIT_MEETING
          ) || isSchedulerOrOwner
        setCanEditMeetingDetails(canEditMeetingDetails)
        const canViewParticipants =
          decryptedMeeting.permissions.includes(
            MeetingPermissions.SEE_GUEST_LIST
          ) || isSchedulerOrOwner
        if (!canViewParticipants) {
          const displayName = getAllParticipantsDisplayName(
            decryptedMeeting?.participants,
            currentAccount?.address,
            false
          )
          setParticipants([
            {
              name: displayName,
              meeting_id: '',
              status: ParticipationStatus.Accepted,
              type: ParticipantType.Invitee,
              slot_id: '',
              isHidden: true,
            },
          ])
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
    } catch (error: unknown) {
      handleApiError('Error fetching meeting information.', error)
    }
    setIsPrefetching(false)
  }
  useEffect(() => {
    if (intent === Intents.UPDATE_MEETING && meetingId) {
      void handleFetchMeetingInformation()
    }
  }, [intent, meetingId, currentAccount?.address])

  return (
    <ScheduleContext.Provider value={context}>
      <Container
        maxW={{
          base: '100%',
          '2xl': '100%',
        }}
        mt={36}
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
          renderCurrentPage()
        )}
        <CancelMeetingDialog
          isOpen={isOpen}
          onClose={onClose}
          decryptedMeeting={decryptedMeeting}
          currentAccount={currentAccount}
          afterCancel={handleRedirect}
        />
      </Container>
    </ScheduleContext.Provider>
  )
}

const EnhancedSchedule: NextPage = withLoginRedirect(
  forceAuthenticationCheck(Schedule)
)

EnhancedSchedule.getInitialProps = async ctx => {
  const { groupId, intent, meetingId, contactId } = ctx.query
  return { groupId, intent, meetingId, contactId }
}

export default withLoginRedirect(EnhancedSchedule)

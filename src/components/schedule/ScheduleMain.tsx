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
import { utcToZonedTime } from 'date-fns-tz'
import { useRouter } from 'next/router'
import React, { FC, useContext, useEffect, useState } from 'react'

import Loading from '@/components/Loading'
import { CancelMeetingDialog } from '@/components/schedule/cancel-dialog'
import InviteParticipants from '@/components/schedule/participants/InviteParticipants'
import ScheduleBase from '@/components/schedule/ScheduleBase'
import ScheduleCompleted from '@/components/schedule/ScheduleCompleted'
import ScheduleTimeDiscover from '@/components/schedule/ScheduleTimeDiscover'
import { AccountContext } from '@/providers/AccountProvider'
import {
  ActionsContext,
  IActionsContext,
} from '@/providers/schedule/ActionsContext'
import { useScheduleNavigation } from '@/providers/schedule/NavigationContext'
import { useParticipants } from '@/providers/schedule/ParticipantsContext'
import { useParticipantPermissions } from '@/providers/schedule/PermissionsContext'
import { useScheduleState } from '@/providers/schedule/ScheduleContext'
import { EditMode, Intents } from '@/types/Dashboard'
import { MeetingProvider, MeetingRepeat, SchedulingType } from '@/types/Meeting'
import {
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '@/types/ParticipantInfo'
import { isGroupParticipant } from '@/types/schedule'
import { logEvent } from '@/utils/analytics'
import {
  getContactById,
  getGroup,
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
import { NO_GROUP_KEY } from '@/utils/constants/group'
import { NO_MEETING_TYPE } from '@/utils/constants/meeting-types'
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
  SCHEDULE_TIME,
  SCHEDULE_DETAILS,
  COMPLETED,
}
interface IInitialProps {
  groupId: string
  intent: Intents
  meetingId: string
  contactId: string
}

const ScheduleMain: FC<IInitialProps> = ({
  groupId,
  intent,
  meetingId,
  contactId,
}) => {
  const { currentAccount } = useContext(AccountContext)
  const {
    title,
    content,
    duration,
    pickedTime,
    timezone,
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
  } = useScheduleState()
  const {
    addGroup,
    groupAvailability,
    groupParticipants,
    groups,
    meetingOwners,
    participants,
    setGroupAvailability,
    setGroupParticipants,
    setMeetingOwners,
    setParticipants,
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
  const toast = useToast()
  const router = useRouter()
  const { push } = router

  const handleGroupPrefetch = async () => {
    if (!groupId) return
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
        addGroup({
          isGroup: true,
          name: group.name,
          id: group.id,
        })
      }
    } catch (error: unknown) {
      handleApiError('Error prefetching group.', error)
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
        setParticipants([participant])
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
  const handleFetchMeetingInformation = async () => {
    if (!meetingId) return
    try {
      const meeting = await getMeeting(meetingId)
      const decryptedMeeting = await decodeMeeting(meeting, currentAccount!)
      if (!decryptedMeeting) {
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
      const start = utcToZonedTime(meeting.start, timezone)
      const end = utcToZonedTime(meeting.end, timezone)
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

      const isSchedulerOrOwner = [
        ParticipantType.Scheduler,
        ParticipantType.Owner,
      ].includes(
        decryptedMeeting?.participants?.find(
          p => p.account_address === currentAccount?.address
        )?.type || ParticipantType?.Invitee
      )
      if (isSchedulerOrOwner && participants.length === 2) {
        setCanCancel(true)
      } else if (isCurrentUserScheduler) {
        setCanCancel(true)
      } else {
        setCanCancel(false)
      }
      if (decryptedMeeting.permissions) {
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
    if (intent === Intents.UPDATE_MEETING && meetingId) {
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
  }, [groupId, contactId, intent, meetingId, currentAccount?.address])
  const handleDelete = async (actor?: ParticipantInfo) => {
    if (!decryptedMeeting) return
    setIsDeleting(true)
    try {
      await deleteMeeting(
        true,
        currentAccount?.address || '',
        NO_MEETING_TYPE,
        decryptedMeeting?.start,
        decryptedMeeting?.end,
        decryptedMeeting,
        getSignature(currentAccount?.address || '') || '',
        actor
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
        currentAccount?.address
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
          name: currentAccount?.preferences?.name || '',
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
      } else {
        await scheduleMeeting(
          true,
          SchedulingType.REGULAR,
          NO_MEETING_TYPE,
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
    }
    setIsScheduling(false)
  }
  const handleRedirect = () => push(`/dashboard/${EditMode.MEETINGS}`)
  const handleCancel = () => onOpen()

  const context: IActionsContext = {
    handleCancel,
    handleDelete,
    handleSchedule,
  }
  return (
    <ActionsContext.Provider value={context}>
      <InviteParticipants
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
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
                <ScheduleTimeDiscover />
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
        />
      </Container>
    </ActionsContext.Provider>
  )
}

export default ScheduleMain

import {
  Box,
  Drawer,
  DrawerBody,
  DrawerContent,
  Portal,
  useDisclosure,
  useToast,
} from '@chakra-ui/react'
import { addMinutes } from 'date-fns'
import { DateTime } from 'luxon'
import * as React from 'react'

import useAccountContext from '@/hooks/useAccountContext'
import {
  createEventsQueryKey,
  useCalendarContext,
} from '@/providers/calendar/CalendarContext'
import { ActionsContext } from '@/providers/schedule/ActionsContext'
import { useScheduleNavigation } from '@/providers/schedule/NavigationContext'
import { useParticipants } from '@/providers/schedule/ParticipantsContext'
import { useParticipantPermissions } from '@/providers/schedule/PermissionsContext'
import { useScheduleState } from '@/providers/schedule/ScheduleContext'
import { isCalendarEventWithoutDateTime } from '@/types/Calendar'
import { MeetingDecrypted, MeetingProvider } from '@/types/Meeting'
import { ParticipantInfo, ParticipantType } from '@/types/ParticipantInfo'
import { isGroupParticipant } from '@/types/schedule'
import { logEvent } from '@/utils/analytics'
import { deleteMeeting, updateMeeting } from '@/utils/calendar_manager'
import { NO_GROUP_KEY } from '@/utils/constants/group'
import { NO_MEETING_TYPE } from '@/utils/constants/meeting-types'
import {
  MeetingNotificationOptions,
  MeetingPermissions,
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
import { canAccountAccessPermission } from '@/utils/generic_utils'
import { queryClient } from '@/utils/react_query'
import { getMergedParticipants, parseAccounts } from '@/utils/schedule.helper'
import { getSignature } from '@/utils/storage'

import { CancelMeetingDialog } from '../schedule/cancel-dialog'
import InviteParticipants from '../schedule/participants/InviteParticipants'
import ScheduleTimeDiscover from '../schedule/ScheduleTimeDiscover'
import ActiveCalendarEvent from './ActiveCalendarEvent'
import ActiveMeetwithEvent from './ActiveMeetwithEvent'

const ActiveEvent: React.FC = ({}) => {
  const { selectedSlot, setSelectedSlot, currentDate } = useCalendarContext()
  const currentAccount = useAccountContext()
  const toast = useToast()
  const {
    duration,
    meetingNotification,
    meetingProvider,
    pickedTime,
    setTitle,
    content,
    meetingUrl,
    title,
    meetingRepeat,
    selectedPermissions,
    setMeetingProvider,
    setMeetingUrl,
    setMeetingNotification,
    setSelectedPermissions,
    setContent,
    setPickedTime,
    setCurrentSelectedDate,
    setDuration,
    setDecryptedMeeting,
    setIsScheduling,
    setTimezone,
    isScheduling,
  } = useScheduleState()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const {
    isOpen: isDiscoverTimeOpen,
    onOpen: onDiscoverTimeOpen,
    onClose: onDiscoverTimeClose,
  } = useDisclosure()
  const decryptedMeeting: MeetingDecrypted | undefined = React.useMemo(() => {
    if (!selectedSlot || isCalendarEventWithoutDateTime(selectedSlot))
      return undefined
    return {
      ...selectedSlot,
      id: selectedSlot.id.split('_')[0],
    }
  }, [selectedSlot])
  const {
    setGroupParticipants,
    setGroupAvailability,
    meetingOwners,
    setParticipants,
    participants,
    groupParticipants,
    groupAvailability,
    groups,
  } = useParticipants()
  const { setInviteModalOpen, inviteModalOpen } = useScheduleNavigation()
  const { setCanEditMeetingDetails, setCanEditMeetingParticipants } =
    useParticipantPermissions()
  React.useEffect(() => {
    if (!selectedSlot) return
    if (!isCalendarEventWithoutDateTime(selectedSlot)) {
      setTitle(selectedSlot.title || 'No Title')
      setContent(selectedSlot.content || '')
      setDuration(
        DateTime.fromJSDate(selectedSlot.end).diff(
          DateTime.fromJSDate(selectedSlot.start),
          'minutes'
        ).minutes || 30
      )
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)
      setMeetingProvider(selectedSlot.provider || MeetingProvider.GOOGLE_MEET)
      setMeetingUrl(selectedSlot.meeting_url || '')
      setPickedTime(new Date(selectedSlot.start))
      const reminders = selectedSlot.reminders || []
      setMeetingNotification(
        MeetingNotificationOptions.filter(option =>
          reminders.includes(option.value)
        )
      )
      setSelectedPermissions(selectedSlot.permissions)
      setIsScheduling(false)
      setDecryptedMeeting(selectedSlot)
      setCurrentSelectedDate(
        selectedSlot.start
          ? DateTime.fromJSDate(selectedSlot.start)
          : currentDate
      )
      const participants = selectedSlot.participants || []
      const participantsMap: Record<string, string[] | undefined> = {
        [NO_GROUP_KEY]: participants
          .map(participant => participant.account_address)
          .filter((address): address is string => !!address),
      }
      setParticipants(participants)
      setGroupParticipants(participantsMap)
      setGroupAvailability(participantsMap)
      const canEditMeetingDetails = canAccountAccessPermission(
        selectedSlot?.permissions,
        selectedSlot?.participants || [],
        currentAccount?.address,
        MeetingPermissions.EDIT_MEETING
      )
      const canEditMeetingParticipants = canAccountAccessPermission(
        selectedSlot?.permissions,
        selectedSlot?.participants || [],
        currentAccount?.address,
        [MeetingPermissions.INVITE_GUESTS, MeetingPermissions.EDIT_MEETING]
      )
      setCanEditMeetingDetails(canEditMeetingDetails)
      setCanEditMeetingParticipants(canEditMeetingParticipants)
    }
  }, [selectedSlot])
  const inviteKey = React.useMemo(
    () =>
      `${Object.values(groupAvailability).flat().length}-${
        Object.values(groupParticipants).flat().length
      }-${participants.length}`,
    [groupAvailability, groupParticipants, participants]
  )
  const handleDelete = React.useCallback(
    async (actor?: ParticipantInfo, decryptedMeeting?: MeetingDecrypted) => {
      if (!decryptedMeeting) return
      try {
        const meeting = await deleteMeeting(
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
        return meeting
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
    },
    [currentAccount, toast]
  )
  const handleCleanup = React.useCallback(async () => {
    // fetch only the current month events immediately
    await queryClient.invalidateQueries(createEventsQueryKey(currentDate))
    Promise.all([
      queryClient.invalidateQueries(
        createEventsQueryKey(currentDate.minus({ month: 1 }))
      ),
      queryClient.invalidateQueries(
        createEventsQueryKey(currentDate.plus({ month: 1 }))
      ),
    ])
    setSelectedSlot(null)
  }, [currentDate, setSelectedSlot])
  const handleUpdate = React.useCallback(async () => {
    try {
      if (
        !selectedSlot ||
        !currentAccount?.address ||
        !decryptedMeeting ||
        isScheduling
      )
        return

      setIsScheduling(true)
      if (!isCalendarEventWithoutDateTime(selectedSlot)) {
        if (!pickedTime) return
        const start = new Date(pickedTime)
        const end = addMinutes(new Date(start), duration)
        const canViewParticipants = canAccountAccessPermission(
          selectedSlot?.permissions,
          selectedSlot?.participants || [],
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
              .concat(selectedSlot?.participants || [])
        const allParticipants = getMergedParticipants(
          actualParticipants,
          groups,
          groupParticipants
        ).map(val => ({
          ...val,
          type: meetingOwners.some(
            owner => owner.account_address === val.account_address
          )
            ? ParticipantType.Owner
            : val.type,
        }))
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
        const canUpdateOtherGuests = canAccountAccessPermission(
          selectedSlot?.permissions,
          selectedSlot?.participants || [],
          currentAccount?.address,
          MeetingPermissions.INVITE_GUESTS
        )

        if (
          !canUpdateOtherGuests &&
          selectedSlot?.participants?.length !== _participants.valid.length
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
        await updateMeeting(
          true,
          currentAccount.address,
          NO_MEETING_TYPE,
          start,
          end,
          decryptedMeeting,
          getSignature(currentAccount.address) || '',
          _participants.valid,
          content,
          meetingUrl,
          meetingProvider,
          title,
          meetingNotification.map(mn => mn.value),
          meetingRepeat.value,
          selectedPermissions
        )
        logEvent('Updated a meeting from calendar view', {
          fromDashboard: true,
          participantsSize: _participants.valid.length,
        })
        await handleCleanup()
      }
      toast({
        title: 'Meeting Updated',
        description: 'The meeting was updated successfully',
        status: 'success',
        duration: 5000,
        position: 'top',
        isClosable: true,
      })
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
      setIsScheduling(false)
      setSelectedSlot(null)
    }
  }, [
    isScheduling,
    selectedSlot,
    currentAccount,
    decryptedMeeting,
    pickedTime,
    duration,
    duration,
    participants,
    groups,
    groupParticipants,
    meetingOwners,
    content,
    meetingUrl,
    meetingProvider,
    title,
    meetingNotification,
    meetingRepeat,
    selectedPermissions,
    toast,
    setIsScheduling,
    setSelectedSlot,
    currentDate,
  ])

  const context = React.useMemo(
    () => ({
      handleDelete,
      handleSchedule: handleUpdate,
      handleCancel: onOpen,
    }),
    [handleDelete, handleUpdate, onOpen]
  )

  return (
    <ActionsContext.Provider value={context}>
      <Drawer
        isOpen={!isDiscoverTimeOpen && !!selectedSlot}
        placement="right"
        onClose={() => !isDiscoverTimeOpen && setSelectedSlot(null)}
        closeOnOverlayClick={!isDiscoverTimeOpen}
        closeOnEsc={!isDiscoverTimeOpen}
      >
        <DrawerContent maxW="500px" bg="bg-event-alternate">
          <DrawerBody p={'30px'}>
            {selectedSlot &&
              (isCalendarEventWithoutDateTime(selectedSlot) ? (
                <ActiveCalendarEvent slot={selectedSlot} />
              ) : (
                <>
                  <CancelMeetingDialog
                    isOpen={isOpen}
                    onClose={onClose}
                    decryptedMeeting={decryptedMeeting}
                    currentAccount={currentAccount}
                    afterCancel={handleCleanup}
                  />
                  <ActiveMeetwithEvent
                    slot={selectedSlot}
                    onDiscoverTimeOpen={onDiscoverTimeOpen}
                  />
                </>
              ))}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
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
      {isDiscoverTimeOpen && (
        <Portal>
          <Box
            position="fixed"
            inset={0}
            zIndex={1000}
            overflowY="scroll"
            px={{
              md: 10,
            }}
            pt={10}
            flex={1}
            pb={16}
            onClick={e => e.stopPropagation()}
          >
            <Box
              inset={0}
              zIndex={-1}
              pos="fixed"
              w="100vw"
              height="100vh"
              bg="#131A20CC"
              backdropFilter={'blur(25px)'}
            />
            <ScheduleTimeDiscover onClose={onDiscoverTimeClose} />
          </Box>
        </Portal>
      )}
    </ActionsContext.Provider>
  )
}

export default ActiveEvent

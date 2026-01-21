import { ALL } from 'node:dns'
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
  CalendarEventsData,
  createEventsQueryKey,
  useCalendarContext,
} from '@/providers/calendar/CalendarContext'
import { ActionsContext } from '@/providers/schedule/ActionsContext'
import { useScheduleNavigation } from '@/providers/schedule/NavigationContext'
import { useParticipants } from '@/providers/schedule/ParticipantsContext'
import { useParticipantPermissions } from '@/providers/schedule/PermissionsContext'
import { useScheduleState } from '@/providers/schedule/ScheduleContext'
import {
  isCalendarEvent,
  isCalendarEventWithoutDateTime,
  mapAttendeeStatusToParticipationStatus,
} from '@/types/Calendar'
import { MeetingDecrypted, MeetingProvider } from '@/types/Meeting'
import { ParticipantInfo, ParticipantType } from '@/types/ParticipantInfo'
import { isGroupParticipant } from '@/types/schedule'
import { logEvent } from '@/utils/analytics'
import { updateCalendarEvent } from '@/utils/api_helper'
import {
  deleteMeeting,
  deleteMeetingInstance,
  deleteMeetingSeries,
  updateMeeting,
  updateMeetingInstance,
  updateMeetingSeries,
} from '@/utils/calendar_manager'
import { NO_GROUP_KEY } from '@/utils/constants/group'
import { MeetingAction, UpdateMode } from '@/utils/constants/meeting'
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
import ConfirmEditModeModal from '../schedule/ConfirmEditMode'
import { CancelMeetingDialog } from '../schedule/cancel-dialog'
import { DeleteEventDialog } from '../schedule/delete-event-dialog'
import InviteParticipants from '../schedule/participants/InviteParticipants'
import ScheduleTimeDiscover from '../schedule/ScheduleTimeDiscover'
import ActiveCalendarEvent from './ActiveCalendarEvent'
import ActiveMeetwithEvent from './ActiveMeetwithEvent'

const ActiveEvent: React.FC = () => {
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
    editMode,
  } = useScheduleState()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const {
    isOpen: isDeleteEventOpen,
    onOpen: onDeleteEventOpen,
    onClose: onDeleteEventClose,
  } = useDisclosure()
  const {
    isOpen: isDiscoverTimeOpen,
    onOpen: onDiscoverTimeOpen,
    onClose: onDiscoverTimeClose,
  } = useDisclosure()
  const {
    isOpen: isEditModeConfirmOpen,
    onOpen: onEditModeConfirmOpen,
    onClose: onEditModeConfirmClose,
  } = useDisclosure()
  const [currentAction, setCurrentAction] = React.useState<
    MeetingAction | undefined
  >(undefined)
  const decryptedMeeting: MeetingDecrypted | undefined = React.useMemo(() => {
    if (!selectedSlot || isCalendarEvent(selectedSlot)) return undefined
    return {
      ...selectedSlot,
      start: selectedSlot.start.toJSDate(),
      end: selectedSlot.end.toJSDate(),
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
  const handleOpenDeleteDialog = () => {
    if (!selectedSlot) return
    if (isCalendarEvent(selectedSlot)) {
      onDeleteEventOpen()
    } else {
      onOpen()
    }
  }
  React.useEffect(() => {
    if (!selectedSlot) return
    if (!isCalendarEvent(selectedSlot)) {
      setTitle(selectedSlot.title || 'No Title')
      setContent(selectedSlot.content || '')
      setDuration(
        selectedSlot.end.diff(selectedSlot.start, 'minutes').minutes || 30
      )
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)
      setMeetingProvider(selectedSlot.provider || MeetingProvider.GOOGLE_MEET)
      setMeetingUrl(selectedSlot.meeting_url || '')
      setPickedTime(selectedSlot.start.toJSDate())
      const reminders = selectedSlot.reminders || []
      setMeetingNotification(
        MeetingNotificationOptions.filter(option =>
          reminders.includes(option.value)
        )
      )
      setSelectedPermissions(selectedSlot.permissions)
      setIsScheduling(false)
      setCurrentSelectedDate(
        selectedSlot.start ? selectedSlot.start : currentDate
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
    } else {
      setTitle(selectedSlot.title || 'No Title')
      setContent(selectedSlot.description || '')
      setDuration(
        selectedSlot.end.diff(selectedSlot.start, 'minutes').minutes || 30
      )
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)
      setMeetingProvider(MeetingProvider.CUSTOM)
      setMeetingUrl(selectedSlot.meeting_url || '')
      setPickedTime(selectedSlot.start.toJSDate())
      setIsScheduling(false)
      setDecryptedMeeting(undefined)
      setCurrentSelectedDate(
        selectedSlot.start ? selectedSlot.start : currentDate
      )
      const participants =
        selectedSlot.attendees?.map(attendee => ({
          id: attendee.email || '',
          guest_email: attendee.email || '',
          name: attendee.name || '',
          type: attendee.isOrganizer
            ? ParticipantType.Scheduler
            : ParticipantType.Invitee,
          status: mapAttendeeStatusToParticipationStatus(attendee.status),
          meeting_id: '',
          account_address:
            attendee.email === selectedSlot.accountEmail
              ? currentAccount?.address || ''
              : undefined,
        })) || []
      setParticipants(participants)
      const canEditMeetingDetails = canAccountAccessPermission(
        selectedSlot?.permissions,
        participants,
        currentAccount?.address,
        MeetingPermissions.EDIT_MEETING
      )
      const canEditMeetingParticipants = canAccountAccessPermission(
        selectedSlot?.permissions,
        participants,
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
        if (selectedSlot?.id.includes('_')) {
          if (editMode === UpdateMode.SINGLE_EVENT) {
            await deleteMeetingInstance(
              decryptedMeeting.id,
              true,
              currentAccount?.address || '',
              decryptedMeeting,
              actor
            )
          } else {
            await deleteMeetingSeries(
              decryptedMeeting.id,
              true,
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
  const handleCleanup = React.useCallback(
    async (slotsRemovedOrOperation?: string[] | 'delete' | 'update') => {
      // fetch only the current month events immediately
      if (!selectedSlot) return
      const isCalEvent = isCalendarEvent(selectedSlot)

      // Determine operation type
      const operation =
        !slotsRemovedOrOperation || Array.isArray(slotsRemovedOrOperation)
          ? 'delete'
          : slotsRemovedOrOperation

      if (operation === 'delete') {
        // For deletions, optimistically remove from cache
        queryClient.setQueriesData<CalendarEventsData>(
          { queryKey: ['calendar-events'] },
          old => {
            if (!old) return old

            return {
              calendarEvents: isCalEvent
                ? (old.calendarEvents?.filter(
                    e => e.sourceEventId !== selectedSlot.sourceEventId
                  ) ?? [])
                : (old.calendarEvents ?? []),
              mwwEvents: !isCalEvent
                ? (old.mwwEvents?.filter(e => e.id !== selectedSlot.id) ?? [])
                : (old.mwwEvents ?? []),
            }
          }
        )
      } else {
        // For updates, invalidate cache to refetch updated data
        await queryClient.invalidateQueries({
          queryKey: ['calendar-events'],
        })
      }

      if (isCalEvent) {
        onDeleteEventClose()
      } else {
        onClose()
      }
      setSelectedSlot(null)
    },
    [currentDate, setSelectedSlot, selectedSlot, onDeleteEventClose, onClose]
  )
  const handleUpdateEvent = React.useCallback(async () => {
    try {
      if (!selectedSlot || !currentAccount?.address || isScheduling) return

      setIsScheduling(true)
      if (!isCalendarEvent(selectedSlot)) {
        if (!decryptedMeeting) {
          setIsScheduling(false)
          return
        }
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
        if (selectedSlot.id.includes('_')) {
          if (editMode === UpdateMode.SINGLE_EVENT) {
            await updateMeetingInstance(
              selectedSlot.id,
              true,
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
              selectedSlot.id,
              true,
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
        }
        logEvent('Updated a meeting from calendar view', {
          fromDashboard: true,
          participantsSize: _participants.valid.length,
        })
        await handleCleanup('update')
      } else {
        // Handle calendar event update
        if (!pickedTime) return
        const start = new Date(pickedTime)
        const end = addMinutes(new Date(start), duration)

        // For single instance of recurring event, only update if mode is SINGLE_EVENT
        const eventToUpdate = {
          ...selectedSlot,
          title,
          description: content,
          start,
          end,
          meeting_url: meetingUrl,
          isAllDay: false,
        }

        // If updating single instance of a series, remove recurrence
        if (selectedSlot.recurrence && editMode === UpdateMode.SINGLE_EVENT) {
          eventToUpdate.recurrence = null
        }

        await updateCalendarEvent(eventToUpdate)

        logEvent('Updated a calendar event from calendar view', {
          source: selectedSlot.source,
          calendarId: selectedSlot.calendarId,
          updateMode: selectedSlot.recurrence ? editMode : 'single',
        })
        await handleCleanup('update')
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
      console.error(e)
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

  const handleUpdate = React.useCallback(async () => {
    if (!selectedSlot) return

    if (isCalendarEvent(selectedSlot)) {
      await handleUpdateEvent()
      return
    }

    // Check if this is a recurring calendar event
    if (selectedSlot.id.includes('_')) {
      setCurrentAction(MeetingAction.SCHEDULE_MEETING)
      onEditModeConfirmOpen()
    } else {
      await handleUpdateEvent()
    }
  }, [selectedSlot, handleUpdateEvent, onEditModeConfirmOpen])

  const handleActionAfterEditModeConfirm = React.useCallback(async () => {
    if (currentAction === MeetingAction.SCHEDULE_MEETING) {
      await handleUpdateEvent()
    } else if (currentAction === MeetingAction.DELETE_MEETING) {
      await handleDelete()
    } else if (currentAction === MeetingAction.CANCEL_MEETING) {
      handleOpenDeleteDialog()
    }
    setCurrentAction(undefined)
  }, [currentAction, handleUpdateEvent])
  const context = React.useMemo(
    () => ({
      handleDelete,
      handleSchedule: handleUpdate,
      handleCancel: handleOpenDeleteDialog,
    }),
    [handleDelete, handleUpdate, handleOpenDeleteDialog]
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
          {selectedSlot && (
            <DrawerBody p={'30px'}>
              {!isCalendarEvent(selectedSlot) ? (
                <CancelMeetingDialog
                  isOpen={isOpen}
                  onClose={onClose}
                  decryptedMeeting={decryptedMeeting}
                  currentAccount={currentAccount}
                  afterCancel={handleCleanup}
                  editMode={editMode}
                />
              ) : (
                <DeleteEventDialog
                  isOpen={isDeleteEventOpen}
                  onClose={onDeleteEventClose}
                  event={{
                    ...selectedSlot,
                    start: selectedSlot.start.toJSDate(),
                    end: selectedSlot.end.toJSDate(),
                  }}
                  afterCancel={() => handleCleanup('delete')}
                />
              )}
              {selectedSlot && (
                <ActiveMeetwithEvent
                  onEditModeConfirmOpen={onEditModeConfirmOpen}
                  setCurrentAction={setCurrentAction}
                  slot={selectedSlot}
                  onDiscoverTimeOpen={onDiscoverTimeOpen}
                />
              )}
            </DrawerBody>
          )}
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
      <ConfirmEditModeModal
        isOpen={isEditModeConfirmOpen}
        onClose={onEditModeConfirmClose}
        afterClose={handleActionAfterEditModeConfirm}
      />
    </ActionsContext.Provider>
  )
}

export default ActiveEvent

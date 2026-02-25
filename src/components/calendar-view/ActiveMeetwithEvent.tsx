import { Button, IconButton } from '@chakra-ui/button'
import { Box, Heading, HStack, Link, Text, VStack } from '@chakra-ui/layout'
import {
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Tooltip,
  useColorModeValue,
  useDisclosure,
  useToast,
} from '@chakra-ui/react'
import { Select, SingleValue } from 'chakra-react-select'
import { DateTime } from 'luxon'
import * as React from 'react'
import { FaTrash } from 'react-icons/fa6'
import { MdCancel, MdOutlineEditCalendar } from 'react-icons/md'

import useAccountContext from '@/hooks/useAccountContext'
import {
  CalendarEventsData,
  createEventsQueryKey,
  useCalendarContext,
} from '@/providers/calendar/CalendarContext'
import { useScheduleActions } from '@/providers/schedule/ActionsContext'
import { useScheduleNavigation } from '@/providers/schedule/NavigationContext'
import { useParticipantPermissions } from '@/providers/schedule/PermissionsContext'
import { useScheduleState } from '@/providers/schedule/ScheduleContext'
import {
  AttendeeStatus,
  isCalendarEvent,
  mapParticipationStatusToAttendeeStatus,
  UnifiedAttendee,
  UnifiedEvent,
  WithInterval,
} from '@/types/Calendar'
import { MeetingReminders } from '@/types/common'
import { MeetingDecrypted, MeetingProvider } from '@/types/Meeting'
import {
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '@/types/ParticipantInfo'
import { logEvent } from '@/utils/analytics'
import { getActor, rsvpMeeting } from '@/utils/calendar_manager'
import { MeetingAction } from '@/utils/constants/meeting'
import { BASE_PROVIDERS } from '@/utils/constants/meeting-types'
import {
  MeetingNotificationOptions,
  MeetingPermissions,
} from '@/utils/constants/schedule'
import {
  getCustomSelectComponents,
  noClearCustomSelectComponent,
  Option,
  rsvpSelectComponent,
} from '@/utils/constants/select'
import {
  canAccountAccessPermission,
  isAccountSchedulerOrOwner,
  renderProviderName,
} from '@/utils/generic_utils'
import { addUTMParams } from '@/utils/huddle.helper'
import { queryClient } from '@/utils/react_query'
import { rsvpQueue } from '@/utils/workers/rsvp.queue'
import { SingleDatepicker } from '../input-date-picker'
import { InputTimePicker } from '../input-time-picker'
import RichTextEditor from '../profile/components/RichTextEditor'
import { DeleteMeetingDialog } from '../schedule/delete-dialog'
import ScheduleParticipantsSchedulerModal from '../schedule/ScheduleParticipantsSchedulerModal'
import MeetingMenu from './MeetingMenu'
import ParticipantsControl from './ParticipantsControl'

interface ActiveMeetwithEventProps {
  slot:
    | WithInterval<UnifiedEvent<DateTime>>
    | WithInterval<MeetingDecrypted<DateTime>>
  onDiscoverTimeOpen: () => void
  setCurrentAction: (action: MeetingAction | undefined) => void
  onEditModeConfirmOpen: () => void
}

const meetingProviders: Array<Option<MeetingProvider>> = BASE_PROVIDERS.concat(
  MeetingProvider.CUSTOM
).map(provider => ({
  value: provider,
  label: renderProviderName(provider),
}))

const RSVP_OPTIONS = [
  {
    label: 'Yes',
    value: ParticipationStatus.Accepted,
  },
  {
    label: 'Maybe',
    value: ParticipationStatus.Pending,
  },
  {
    label: 'No',
    value: ParticipationStatus.Rejected,
  },
]
interface RSVPOption {
  label: string
  value: ParticipationStatus
}
const ActiveMeetwithEvent: React.FC<ActiveMeetwithEventProps> = ({
  slot,
  onDiscoverTimeOpen,
  onEditModeConfirmOpen,
  setCurrentAction,
}) => {
  const [isTitleValid, setIsTitleValid] = React.useState(true)
  const currentAccount = useAccountContext()
  const { setInviteModalOpen } = useScheduleNavigation()
  const {
    title,
    content,
    duration,
    pickedTime,
    meetingProvider,
    meetingUrl,
    meetingNotification,
    timezone,
    setTitle,
    setContent,
    setMeetingProvider,
    setMeetingUrl,
    setMeetingNotification,
    isScheduling,
    setPickedTime,
  } = useScheduleState()
  const { handleSchedule, handleCancel } = useScheduleActions()
  const { canEditMeetingDetails } = useParticipantPermissions()
  const [actor, setActor] = React.useState<
    UnifiedAttendee | ParticipantInfo | undefined
  >(getActor(slot, currentAccount!))
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure()
  const {
    isOpen: isEditSchedulerOpen,
    onOpen: onEditSchedulerOpen,
    onClose: onEditSchedulerClose,
  } = useDisclosure()

  const timezoneDate = React.useMemo(() => {
    if (!pickedTime) {
      return new Date()
    }
    return DateTime.fromJSDate(pickedTime).setZone(timezone).toJSDate()
  }, [pickedTime, timezone])
  const formattedTime = React.useMemo(() => {
    if (!pickedTime) {
      return 'Invalid date'
    }
    return DateTime.fromJSDate(pickedTime).setZone(timezone).toFormat('hh:mm a')
  }, [pickedTime, timezone])
  const toast = useToast()
  const canEditMeeting = React.useMemo(() => {
    return isCalendarEvent(slot)
      ? slot.permissions.includes(MeetingPermissions.EDIT_MEETING)
      : canAccountAccessPermission(
          slot?.permissions,
          slot?.participants || [],
          currentAccount?.address,
          MeetingPermissions.EDIT_MEETING
        )
  }, [slot, currentAccount])

  const { setSelectedSlot, currentDate } = useCalendarContext()
  const iconColor = useColorModeValue('gray.500', 'gray.200')
  const menuBgColor = useColorModeValue('gray.50', 'neutral.800')
  React.useEffect(() => {
    setActor(getActor(slot, currentAccount!))
  }, [slot, currentAccount])
  const rsvpAbortControllerRef = React.useRef<AbortController | null>(null)

  const [rsvp, setRsvp] = React.useState<RSVPOption | undefined>(
    RSVP_OPTIONS.map(({ label, value }) => ({
      label: `RSVP: ${label}`,
      value,
    })).find(option => option.value === actor?.status)
  )
  const handleRSVP = async (status: ParticipationStatus) => {
    if (!actor || !currentAccount) return
    if (
      status === actor.status ||
      actor.status === mapParticipationStatusToAttendeeStatus(status)
    )
      return
    const previousStatus = actor.status

    if (rsvpAbortControllerRef.current) {
      rsvpAbortControllerRef.current.abort()
    }

    const abortController = new AbortController()
    rsvpAbortControllerRef.current = abortController

    logEvent(`Clicked RSVP ${status} from Event Details PopOver`)
    setActor(prev => {
      if (!prev) return prev
      if (!isCalendarEvent(slot)) {
        const participantInfo = prev as ParticipantInfo
        return previousStatus ? { ...participantInfo, status: status } : prev
      } else {
        const unifiedAttendee = prev as UnifiedAttendee
        return previousStatus
          ? {
              ...unifiedAttendee,
              status: mapParticipationStatusToAttendeeStatus(status),
            }
          : prev
      }
    })
    try {
      if (!isCalendarEvent(slot)) {
        // Optimistic cache update before API call so that
        // decryptedMeeting (derived from selectedSlot) stays fresh
        // when the user clicks "Update Meeting".
        queryClient.setQueryData<CalendarEventsData>(
          createEventsQueryKey(currentDate),
          old => {
            if (!old?.mwwEvents) return old
            return {
              ...old,
              mwwEvents: old.mwwEvents.map((event: MeetingDecrypted) => {
                if (event.id !== slot.id) return event
                return {
                  ...event,
                  participants: event.participants.map(p =>
                    p.account_address === currentAccount?.address
                      ? { ...p, status }
                      : p
                  ),
                }
              }),
            }
          }
        )
        await rsvpMeeting(
          slot.id,
          currentAccount.address,
          status,
          abortController.signal
        )
      } else {
        const attendeeStatus = mapParticipationStatusToAttendeeStatus(status)
        queryClient.setQueryData<CalendarEventsData>(
          createEventsQueryKey(currentDate),
          old => {
            if (!old?.calendarEvents) return old
            return {
              ...old,
              calendarEvents: old.calendarEvents.map((event: UnifiedEvent) => {
                if (event.id !== slot.id) return event
                return {
                  ...event,
                  attendees: event.attendees?.map(attendee =>
                    attendee.email === slot.accountEmail
                      ? { ...attendee, status: attendeeStatus }
                      : attendee
                  ),
                }
              }),
            }
          }
        )
        await rsvpQueue.enqueue(
          slot.calendarId,
          slot.sourceEventId,
          attendeeStatus,
          slot.accountEmail,
          abortController.signal
        )
      }
    } catch (error) {
      console.error('Failed to update RSVP:', error)
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was cancelled, ignore
        return
      }
      // Revert UI change
      setActor(prev => {
        if (!prev) return prev
        if (!isCalendarEvent(slot)) {
          const participantInfo = prev as ParticipantInfo
          return previousStatus
            ? {
                ...participantInfo,
                status: previousStatus as ParticipationStatus,
              }
            : prev
        } else {
          const unifiedAttendee = prev as UnifiedAttendee
          return previousStatus
            ? { ...unifiedAttendee, status: previousStatus as AttendeeStatus }
            : prev
        }
      })
      // Revert optimistic cache update
      if (!isCalendarEvent(slot)) {
        queryClient.setQueryData<CalendarEventsData>(
          createEventsQueryKey(currentDate),
          old => {
            if (!old?.mwwEvents) return old
            return {
              ...old,
              mwwEvents: old.mwwEvents.map((event: MeetingDecrypted) => {
                if (event.id !== slot.id) return event
                return {
                  ...event,
                  participants: event.participants.map(p =>
                    p.account_address === currentAccount?.address
                      ? {
                          ...p,
                          status: previousStatus as ParticipationStatus,
                        }
                      : p
                  ),
                }
              }),
            }
          }
        )
      }
    }
  }
  const _onChange = (newValue: RSVPOption) => {
    if (Array.isArray(newValue)) {
      return
    }
    setRsvp({ ...newValue, label: `RSVP: ${newValue.label}` } as RSVPOption)
    void handleRSVP(newValue.value)
  }
  const isSchedulerOrOwner = React.useMemo(() => {
    return isCalendarEvent(slot)
      ? slot.permissions.includes(MeetingPermissions.EDIT_MEETING) ||
          slot.permissions.includes(MeetingPermissions.INVITE_GUESTS)
      : isAccountSchedulerOrOwner(slot?.participants, currentAccount?.address)
  }, [slot, currentAccount])
  const meetingProviderValue = meetingProviders.find(
    provider => provider.value === meetingProvider
  )
  const _onChangeProvider = (
    newValue: SingleValue<Option<MeetingProvider>>
  ) => {
    setMeetingProvider(newValue?.value || MeetingProvider.CUSTOM)
  }
  const handleDelete = () => {
    if (!isCalendarEvent(slot)) {
      if (
        isAccountSchedulerOrOwner(slot?.participants, currentAccount?.address, [
          ParticipantType.Scheduler,
        ])
      ) {
        onEditSchedulerOpen()
      } else {
        onDeleteOpen()
      }
    }
  }
  if (!currentAccount) {
    return null
  }
  return (
    <VStack alignItems="flex-start" spacing={4} w="100%">
      <Button
        color="primary.200"
        fontWeight={700}
        onClick={() => setSelectedSlot(null)}
        variant="link"
      >
        Close
      </Button>
      <HStack gap={4}>
        <Link
          _hover={{
            textDecoration: 'none',
          }}
          flex={1}
          href={addUTMParams(slot?.meeting_url || '')}
          isExternal
          maxWidth="100%"
          onClick={() => logEvent('Joined a meeting')}
          overflow="hidden"
          textDecoration="none"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
        >
          <Button colorScheme="primary">Join meeting</Button>
        </Link>
        {!isCalendarEvent(slot) && (
          <Tooltip label="Delete meeting for me" placement="top">
            <IconButton
              aria-label="delete"
              bg={menuBgColor}
              color={iconColor}
              icon={<FaTrash size={16} />}
              onClick={handleDelete}
            />
          </Tooltip>
        )}
        {isSchedulerOrOwner &&
          !(isCalendarEvent(slot) && slot.isReadOnlyCalendar) && (
            <Tooltip label="Cancel meeting for all" placement="top">
              <IconButton
                aria-label="remove"
                bg={menuBgColor}
                color={iconColor}
                icon={<MdCancel size={16} />}
                onClick={() => {
                  if (isCalendarEvent(slot)) {
                    handleCancel()
                  } else {
                    if (slot.id.includes('_')) {
                      setCurrentAction(MeetingAction.CANCEL_MEETING)
                      onEditModeConfirmOpen()
                    } else {
                      handleCancel()
                    }
                  }
                }}
              />
            </Tooltip>
          )}
        <Select
          chakraStyles={{
            control: provided => ({
              ...provided,

              paddingInline: '10px',
            }),
            valueContainer: provided => ({
              ...provided,
              padding: 0,
            }),
            singleValue: provided => ({
              ...provided,
              margin: 0,
            }),
            container: provided => ({
              ...provided,
              borderWidth: '0px',
              bg: menuBgColor,
              width: 'fit-content',
              minWidth: '100px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 700,
            }),
          }}
          className="noLeftBorder rsvp-select"
          colorScheme="primary"
          components={rsvpSelectComponent}
          onChange={change => _onChange(change as RSVPOption)}
          options={RSVP_OPTIONS}
          isDisabled={
            isScheduling || (isCalendarEvent(slot) && slot.isReadOnlyCalendar)
          }
          placeholder="RSVP"
          value={rsvp}
        />

        {!isCalendarEvent(slot) && (
          <MeetingMenu
            currentAccount={currentAccount}
            slot={{
              ...slot,
              start: slot.start.toJSDate(),
              end: slot.end.toJSDate(),
            }}
          />
        )}
      </HStack>
      {!isCalendarEvent(slot) && (
        <>
          <ScheduleParticipantsSchedulerModal
            decryptedMeeting={{
              ...slot,
              start: slot.start.toJSDate(),
              end: slot.end.toJSDate(),
            }}
            isOpen={isEditSchedulerOpen}
            onClose={onEditSchedulerClose}
            participants={slot?.participants || []}
          />
          <DeleteMeetingDialog
            afterCancel={() => setSelectedSlot(null)}
            currentAccount={currentAccount}
            decryptedMeeting={{
              ...slot,
              start: slot.start.toJSDate(),
              end: slot.end.toJSDate(),
            }}
            isOpen={isDeleteOpen}
            onClose={onDeleteClose}
          />
        </>
      )}
      <VStack alignItems="flex-start" gap={6} w={'100%'}>
        <Heading fontSize="x-large">Meeting Information</Heading>
        {!isCalendarEvent(slot) && (
          <ParticipantsControl
            currentAccount={currentAccount}
            openInviteModal={() => setInviteModalOpen(true)}
          />
        )}
        <FormControl>
          <FormLabel>Date/Time</FormLabel>
          <HStack alignItems="stretch" gap={3}>
            <Box
              cursor={canEditMeeting ? 'pointer' : 'default'}
              flex="1"
              onClick={canEditMeeting ? onDiscoverTimeOpen : undefined}
            >
              <SingleDatepicker
                date={timezoneDate}
                disabled={!canEditMeeting}
                // iconColor="neutral.300"
                iconSize={20}
                inputProps={{
                  py: 3,
                  pl: 12,
                  borderColor: 'neutral.400',
                  borderRadius: '6px',
                }}
                onDateChange={time => setPickedTime(new Date(time))}
              />
            </Box>
            <Box cursor={canEditMeeting ? 'pointer' : 'default'} flex="1">
              <InputTimePicker
                currentDate={timezoneDate}
                disabled={!canEditMeeting}
                iconColor="neutral.300"
                iconSize={20}
                inputProps={{
                  py: 3,
                  pl: 12,
                  borderColor: 'neutral.400',
                  borderRadius: '6px',
                }}
                onChange={time => setPickedTime(new Date(time))}
                value={formattedTime}
              />
            </Box>
            {canEditMeeting && (
              <IconButton
                _hover={{
                  bg: 'primary.300',
                }}
                aria-label="Edit date and time"
                bg="primary.200"
                borderRadius="6px"
                color="neutral.900"
                icon={<MdOutlineEditCalendar size={20} />}
                isDisabled={!canEditMeeting}
                onClick={onDiscoverTimeOpen}
              />
            )}
          </HStack>
        </FormControl>
        <FormControl isDisabled={!canEditMeeting} isInvalid={!isTitleValid}>
          <FormLabel
            _invalid={{
              color: 'red.500',
            }}
          >
            Title
            <Text color="red.500" display="inline">
              *
            </Text>
          </FormLabel>
          <Input
            _placeholder={{
              color: 'neutral.400',
            }}
            borderColor="neutral.400"
            errorBorderColor="red.500"
            isInvalid={!isTitleValid}
            onChange={e => {
              if (!isTitleValid && e.target.value) {
                setIsTitleValid(true)
              }
              return setTitle(e.target.value)
            }}
            placeholder="Enter meeting title"
            value={title}
          />
          {!isTitleValid && (
            <FormHelperText color="red.500">Title is required</FormHelperText>
          )}
        </FormControl>
        <FormControl isDisabled={!canEditMeeting}>
          <FormLabel htmlFor="info">Description (optional)</FormLabel>
          <RichTextEditor
            id="info"
            isDisabled={!canEditMeeting}
            onValueChange={setContent}
            placeholder="Any information you want to share prior to the meeting?"
            value={content}
          />
        </FormControl>
        <FormControl
          isDisabled={!canEditMeetingDetails || isScheduling}
          maxW="100%"
          w="100%"
        >
          <FormLabel>Location</FormLabel>
          <Select<Option<MeetingProvider>>
            chakraStyles={{
              container: provided => ({
                ...provided,
                borderColor: 'input-border',
                borderRadius: 'md',
                maxW: '100%',
                display: 'block',
              }),
            }}
            className="noLeftBorder timezone-select"
            colorScheme="primary"
            components={getCustomSelectComponents<
              Option<MeetingProvider>,
              false
            >()}
            onChange={newValue => _onChangeProvider(newValue)}
            options={meetingProviders}
            value={meetingProviderValue}
          />
          {meetingProvider === MeetingProvider.CUSTOM && (
            <Input
              isDisabled={isScheduling}
              my={4}
              borderColor="neutral.400"
              errorBorderColor="red.500"
              onChange={e => setMeetingUrl(e.target.value)}
              placeholder="insert a custom meeting url"
              type="text"
              value={meetingUrl}
            />
          )}
        </FormControl>

        <FormControl
          display={isCalendarEvent(slot) ? 'none' : 'block'}
          isDisabled={!canEditMeeting}
          maxW="100%"
          w="100%"
        >
          <FormLabel>Meeting Reminders</FormLabel>
          <Select
            chakraStyles={{
              container: provided => ({
                ...provided,
                borderColor: 'input-border',
                borderRadius: 'md',
                maxW: '100%',
                display: 'block',
              }),

              placeholder: provided => ({
                ...provided,
                textAlign: 'left',
              }),
            }}
            className="noLeftBorder timezone-select"
            colorScheme="gray"
            components={noClearCustomSelectComponent}
            isDisabled={!canEditMeeting}
            isMulti
            onChange={val => {
              const meetingNotification = val as Array<{
                value: MeetingReminders
                label?: string
              }>
              // can't select more than 5 notifications
              if (meetingNotification.length > 5) {
                toast({
                  title: 'Limit reached',
                  description: 'You can select up to 5 notifications only.',
                  status: 'warning',
                  duration: 3000,
                  isClosable: true,
                })
                return
              }
              setMeetingNotification(meetingNotification)
            }}
            options={MeetingNotificationOptions}
            placeholder="Select Notification Alerts"
            tagVariant={'solid'}
            value={meetingNotification}
          />
        </FormControl>
        <Button
          colorScheme="primary"
          flex={1}
          flexBasis="50%"
          h={'auto'}
          isDisabled={
            !title ||
            !duration ||
            !pickedTime ||
            !canEditMeetingDetails ||
            isScheduling ||
            (isCalendarEvent(slot) && slot.isReadOnlyCalendar)
          }
          isLoading={isScheduling}
          onClick={() => {
            if (isCalendarEvent(slot)) {
              handleSchedule()
            } else {
              if (slot.id.includes('_')) {
                setCurrentAction(MeetingAction.SCHEDULE_MEETING)
                onEditModeConfirmOpen()
              } else {
                handleSchedule()
              }
            }
          }}
          py={3}
          w="100%"
        >
          Update Meeting
        </Button>
      </VStack>
    </VStack>
  )
}

export default ActiveMeetwithEvent

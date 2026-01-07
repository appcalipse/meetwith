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
import { MeetingReminders } from '@/types/common'
import { MeetingDecrypted, MeetingProvider } from '@/types/Meeting'
import { ParticipantType, ParticipationStatus } from '@/types/ParticipantInfo'
import { logEvent } from '@/utils/analytics'
import { rsvpMeeting } from '@/utils/calendar_manager'
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

import { SingleDatepicker } from '../input-date-picker'
import { InputTimePicker } from '../input-time-picker'
import RichTextEditor from '../profile/components/RichTextEditor'
import { DeleteMeetingDialog } from '../schedule/delete-dialog'
import ScheduleParticipantsSchedulerModal from '../schedule/ScheduleParticipantsSchedulerModal'
import MeetingMenu from './MeetingMenu'
import ParticipantsControl from './ParticipantsControl'

interface ActiveMeetwithEventProps {
  slot: MeetingDecrypted
  onDiscoverTimeOpen: () => void
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
  } = useScheduleState()
  const { handleSchedule, handleCancel } = useScheduleActions()
  const { canEditMeetingDetails } = useParticipantPermissions()
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
  const canEditMeeting = canAccountAccessPermission(
    slot?.permissions,
    slot?.participants || [],
    currentAccount?.address,
    MeetingPermissions.EDIT_MEETING
  )

  const { setSelectedSlot, currentDate } = useCalendarContext()
  const iconColor = useColorModeValue('gray.500', 'gray.200')
  const menuBgColor = useColorModeValue('gray.50', 'neutral.800')
  const actor = slot.participants.find(
    participant => participant.account_address === currentAccount?.address
  )
  const rsvpAbortControllerRef = React.useRef<AbortController | null>(null)

  const [rsvp, setRsvp] = React.useState<RSVPOption | undefined>(
    RSVP_OPTIONS.map(({ label, value }) => ({
      label: `RSVP: ${label}`,
      value,
    })).find(option => option.value === actor?.status)
  )
  const handleRSVP = async (status: ParticipationStatus) => {
    if (!actor || !currentAccount) return
    if (status === actor.status) return
    // cancel any in-flight rsvp request
    if (rsvpAbortControllerRef.current) {
      rsvpAbortControllerRef.current.abort()
    }

    const abortController = new AbortController()
    rsvpAbortControllerRef.current = abortController

    logEvent(`Clicked RSVP ${status} from Event Details PopOver`)

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

    try {
      await rsvpMeeting(
        slot.id,
        currentAccount.address,
        status,
        abortController.signal
      )
    } catch (error) {
      console.error('Failed to update RSVP:', error)
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was cancelled, ignore
        return
      }
      queryClient.invalidateQueries(createEventsQueryKey(currentDate))
    }
  }
  const _onChange = (newValue: RSVPOption) => {
    if (Array.isArray(newValue)) {
      return
    }
    setRsvp({ ...newValue, label: `RSVP: ${newValue.label}` } as RSVPOption)
    void handleRSVP(newValue.value)
  }
  const isSchedulerOrOwner = isAccountSchedulerOrOwner(
    slot?.participants,
    currentAccount?.address
  )
  const meetingProviderValue = meetingProviders.find(
    provider => provider.value === meetingProvider
  )
  const _onChangeProvider = (
    newValue: SingleValue<Option<MeetingProvider>>
  ) => {
    setMeetingProvider(newValue?.value || MeetingProvider.CUSTOM)
  }
  const handleDelete = () => {
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
  if (!currentAccount) {
    return null
  }
  return (
    <VStack w="100%" spacing={4} alignItems="flex-start">
      <Button
        variant="link"
        color="primary.200"
        fontWeight={700}
        onClick={() => setSelectedSlot(null)}
      >
        Close
      </Button>
      <HStack gap={4}>
        <Link
          href={addUTMParams(slot?.meeting_url || '')}
          isExternal
          onClick={() => logEvent('Joined a meeting')}
          whiteSpace="nowrap"
          overflow="hidden"
          textOverflow="ellipsis"
          maxWidth="100%"
          textDecoration="none"
          flex={1}
          _hover={{
            textDecoration: 'none',
          }}
        >
          <Button colorScheme="primary">Join meeting</Button>
        </Link>
        <Tooltip label="Delete meeting for me" placement="top">
          <IconButton
            color={iconColor}
            aria-label="delete"
            icon={<FaTrash size={16} />}
            onClick={handleDelete}
            bg={menuBgColor}
          />
        </Tooltip>
        {isSchedulerOrOwner && (
          <Tooltip label="Cancel meeting for all" placement="top">
            <IconButton
              color={iconColor}
              aria-label="remove"
              icon={<MdCancel size={16} />}
              onClick={handleCancel}
              bg={menuBgColor}
            />
          </Tooltip>
        )}
        <Select
          value={rsvp}
          colorScheme="primary"
          onChange={change => _onChange(change as RSVPOption)}
          className="noLeftBorder rsvp-select"
          options={RSVP_OPTIONS}
          placeholder="RSVP"
          components={rsvpSelectComponent}
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
        />

        <MeetingMenu slot={slot} currentAccount={currentAccount} />
      </HStack>
      <ScheduleParticipantsSchedulerModal
        isOpen={isEditSchedulerOpen}
        onClose={onEditSchedulerClose}
        participants={slot?.participants || []}
        decryptedMeeting={slot}
      />
      <DeleteMeetingDialog
        isOpen={isDeleteOpen}
        onClose={onDeleteClose}
        decryptedMeeting={slot}
        currentAccount={currentAccount}
        afterCancel={() => setSelectedSlot(null)}
      />
      <VStack w={'100%'} gap={6} alignItems="flex-start">
        <Heading fontSize="x-large">Meeting Information</Heading>
        <ParticipantsControl
          currentAccount={currentAccount}
          openInviteModal={() => setInviteModalOpen(true)}
        />
        <FormControl>
          <FormLabel>Date/Time</FormLabel>
          <HStack alignItems="stretch" gap={3}>
            <Box
              flex="1"
              cursor={canEditMeeting ? 'pointer' : 'default'}
              onClick={canEditMeeting ? onDiscoverTimeOpen : undefined}
            >
              <SingleDatepicker
                date={timezoneDate}
                onDateChange={() => undefined}
                // iconColor="neutral.300"
                iconSize={20}
                disabled={!canEditMeeting}
                inputProps={{
                  py: 3,
                  pl: 12,
                  borderColor: 'neutral.400',
                  borderRadius: '6px',
                }}
              />
            </Box>
            <Box flex="1" cursor={canEditMeeting ? 'pointer' : 'default'}>
              <InputTimePicker
                currentDate={timezoneDate}
                value={formattedTime}
                onChange={() => undefined}
                iconColor="neutral.300"
                iconSize={20}
                disabled={!canEditMeeting}
                inputProps={{
                  py: 3,
                  pl: 12,
                  borderColor: 'neutral.400',
                  borderRadius: '6px',
                }}
              />
            </Box>
            {canEditMeeting && (
              <IconButton
                aria-label="Edit date and time"
                icon={<MdOutlineEditCalendar size={20} />}
                onClick={onDiscoverTimeOpen}
                isDisabled={!canEditMeeting}
                bg="primary.200"
                color="neutral.900"
                borderRadius="6px"
                _hover={{
                  bg: 'primary.300',
                }}
              />
            )}
          </HStack>
        </FormControl>
        <FormControl isInvalid={!isTitleValid} isDisabled={!canEditMeeting}>
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
            placeholder="Enter meeting title"
            _placeholder={{
              color: 'neutral.400',
            }}
            borderColor="neutral.400"
            value={title}
            onChange={e => {
              if (!isTitleValid && e.target.value) {
                setIsTitleValid(true)
              }
              return setTitle(e.target.value)
            }}
            errorBorderColor="red.500"
            isInvalid={!isTitleValid}
          />
          {!isTitleValid && (
            <FormHelperText color="red.500">Title is required</FormHelperText>
          )}
        </FormControl>
        <FormControl isDisabled={!canEditMeeting}>
          <FormLabel htmlFor="info">Description (optional)</FormLabel>
          <RichTextEditor
            id="info"
            value={content}
            onValueChange={setContent}
            placeholder="Any information you want to share prior to the meeting?"
            isDisabled={!canEditMeeting}
          />
        </FormControl>
        <VStack alignItems="start" w={'100%'} gap={4}>
          <Text fontSize="18px" fontWeight={500}>
            Location
          </Text>
          <Select<Option<MeetingProvider>>
            value={meetingProviderValue}
            colorScheme="primary"
            onChange={newValue => _onChangeProvider(newValue)}
            onInputChange={console.log}
            className="noLeftBorder timezone-select"
            options={meetingProviders}
            components={getCustomSelectComponents<
              Option<MeetingProvider>,
              false
            >()}
            chakraStyles={{
              container: provided => ({
                ...provided,
                borderColor: 'input-border',
                w: '100%',
              }),
            }}
          />
          {meetingProvider === MeetingProvider.CUSTOM && (
            <Input
              type="text"
              placeholder="insert a custom meeting url"
              isDisabled={!canEditMeeting}
              mb={4}
              value={meetingUrl}
              onChange={e => setMeetingUrl(e.target.value)}
            />
          )}
        </VStack>

        <FormControl w="100%" maxW="100%" isDisabled={!canEditMeeting}>
          <FormLabel>Meeting Reminders</FormLabel>
          <Select
            value={meetingNotification}
            colorScheme="gray"
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
            isDisabled={!canEditMeeting}
            className="noLeftBorder timezone-select"
            placeholder="Select Notification Alerts"
            isMulti
            tagVariant={'solid'}
            options={MeetingNotificationOptions}
            components={noClearCustomSelectComponent}
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
          />
        </FormControl>
        <Button
          w="100%"
          py={3}
          flex={1}
          flexBasis="50%"
          h={'auto'}
          colorScheme="primary"
          onClick={handleSchedule}
          isLoading={isScheduling}
          isDisabled={
            !title ||
            !duration ||
            !pickedTime ||
            !canEditMeetingDetails ||
            isScheduling
          }
        >
          Update Meeting
        </Button>
      </VStack>
    </VStack>
  )
}

export default ActiveMeetwithEvent

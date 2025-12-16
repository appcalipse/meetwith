import { Button, IconButton } from '@chakra-ui/button'
import { CheckIcon } from '@chakra-ui/icons'
import {
  Badge,
  Box,
  Center,
  Heading,
  HStack,
  Link,
  Text,
  VStack,
} from '@chakra-ui/layout'
import {
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Portal,
  Radio,
  RadioGroup,
  Tooltip,
  useColorModeValue,
  useDisclosure,
  useToast,
} from '@chakra-ui/react'
import { Select } from 'chakra-react-select'
import { DateTime } from 'luxon'
import * as React from 'react'
import { BsDash } from 'react-icons/bs'
import { FaEllipsisV } from 'react-icons/fa'
import { FaTrash, FaX } from 'react-icons/fa6'
import { IoPersonAddOutline } from 'react-icons/io5'
import { MdCancel, MdOutlineEditCalendar } from 'react-icons/md'

import useAccountContext from '@/hooks/useAccountContext'
import { useCalendarContext } from '@/providers/calendar/CalendarContext'
import { useScheduleState } from '@/providers/schedule/ScheduleContext'
import { MeetingReminders } from '@/types/common'
import { Intents } from '@/types/Dashboard'
import {
  MeetingChangeType,
  MeetingDecrypted,
  MeetingProvider,
} from '@/types/Meeting'
import {
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '@/types/ParticipantInfo'
import { logEvent } from '@/utils/analytics'
import {
  generateGoogleCalendarUrl,
  generateIcs,
  generateOffice365CalendarUrl,
} from '@/utils/calendar_manager'
import { appUrl } from '@/utils/constants'
import { BASE_PROVIDERS } from '@/utils/constants/meeting-types'
import {
  MeetingNotificationOptions,
  MeetingPermissions,
} from '@/utils/constants/schedule'
import {
  noClearCustomSelectComponent,
  rsvpSelectComponent,
} from '@/utils/constants/select'
import {
  canAccountAccessPermission,
  isAccountSchedulerOrOwner,
  renderProviderName,
} from '@/utils/generic_utils'
import { addUTMParams } from '@/utils/huddle.helper'
import { useToastHelpers } from '@/utils/toasts'
import { ellipsizeAddress } from '@/utils/user_manager'

import { ChipInput } from '../chip-input'
import { chipStyles } from '../chip-input/chip'
import { SingleDatepicker } from '../input-date-picker'
import { InputTimePicker } from '../input-time-picker'
import RichTextEditor from '../profile/components/RichTextEditor'
import { CancelMeetingDialog } from '../schedule/cancel-dialog'
import { DeleteMeetingDialog } from '../schedule/delete-dialog'
import ScheduleParticipantsSchedulerModal from '../schedule/ScheduleParticipantsSchedulerModal'

interface ActiveMeetwithEventProps {
  slot: MeetingDecrypted
}
const renderRsvpStatus = (status: ParticipationStatus) => {
  switch (status) {
    case ParticipationStatus.Accepted:
      return (
        <VStack
          as="span"
          w={3}
          h={3}
          bg="green.500"
          rounded="full"
          justify="center"
          align="center"
          ml={1}
        >
          <CheckIcon width={'8px'} height={'8px'} />
        </VStack>
      )
    case ParticipationStatus.Rejected:
      return (
        <VStack
          as="span"
          w={3}
          h={3}
          bg="red.250"
          rounded="full"
          justify="center"
          align="center"
          ml={1}
        >
          <FaX size={8} />
        </VStack>
      )
    case ParticipationStatus.Pending:
      return (
        <VStack
          as="span"
          w={3}
          h={3}
          bg="#FF8D28"
          rounded="full"
          justify="center"
          align="center"
          ml={1}
        >
          <BsDash width={'8px'} height={'8px'} />
        </VStack>
      )
  }
}
const meetingProviders = BASE_PROVIDERS.concat(MeetingProvider.CUSTOM)

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
const ActiveMeetwithEvent: React.FC<ActiveMeetwithEventProps> = ({ slot }) => {
  const {
    isOpen: isCancelOpen,
    onOpen: onCancelOpen,
    onClose: onCancelClose,
  } = useDisclosure()
  const [isTitleValid, setIsTitleValid] = React.useState(true)
  const {
    title,
    content,
    duration,
    pickedTime,
    meetingProvider,
    meetingUrl,
    meetingNotification,
    meetingRepeat,
    timezone,
    isScheduling,
    selectedPermissions,
    setTitle,
    setMeetingProvider,
    setMeetingUrl,
    setMeetingNotification,
    setMeetingRepeat,
    setSelectedPermissions,
    setContent,
    decryptedMeeting,
    currentSelectedDate,
    setPickedTime,
    setCurrentSelectedDate,
    setDuration,
    setDecryptedMeeting,
    setIsScheduling,
    setTimezone,
  } = useScheduleState()
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
  React.useEffect(() => {
    // setTitle(slot.title)
    setContent(slot.content || '')
    // setMeetingProvider(slot.provider)
    setMeetingUrl(slot.meeting_url || '')
    setPickedTime(new Date(slot.start))
    setMeetingNotification(
      (slot.reminders || []).map(reminder => ({
        value: reminder,
      }))
    )
    setSelectedPermissions(slot.permissions)
    // setIsScheduling(false)
    setDecryptedMeeting(slot)
    setCurrentSelectedDate(new Date(slot.start))
    setDuration(Math.ceil((slot.end.getTime() - slot.start.getTime()) / 60000))
  }, [])
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
  const currentAccount = useAccountContext()
  const toast = useToast()
  const canEditMeeting = canAccountAccessPermission(
    slot?.permissions,
    slot?.participants || [],
    currentAccount?.address,
    MeetingPermissions.EDIT_MEETING
  )
  const handlePickNewTime = React.useCallback(() => {
    if (!canEditMeeting) {
      return
    }
  }, [canEditMeeting])
  const { selectedSlot, setSelectedSlot } = useCalendarContext()
  const iconColor = useColorModeValue('gray.500', 'gray.200')
  const menuBgColor = useColorModeValue('gray.50', 'neutral.800')
  const actor = slot.participants.find(
    participant => participant.account_address === currentAccount?.address
  )
  const [rsvp, setRsvp] = React.useState<RSVPOption | undefined>(
    RSVP_OPTIONS.map(({ label, value }) => ({
      label: `RSVP: ${label}`,
      value,
    })).find(option => option.value === actor?.status)
  )
  const { showSuccessToast, showInfoToast, showErrorToast } = useToastHelpers()
  const _onChange = (newValue: RSVPOption) => {
    if (Array.isArray(newValue)) {
      return
    }

    setRsvp({ ...newValue, label: `RSVP: ${newValue.label}` } as RSVPOption)
  }
  const isSchedulerOrOwner = isAccountSchedulerOrOwner(
    slot?.participants,
    currentAccount?.address
  )
  const downloadIcs = async (
    info: MeetingDecrypted,
    currentConnectedAccountAddress: string
  ) => {
    try {
      showInfoToast(
        'Downloading calendar invite',
        'Your download will begin shortly. Please check your downloads folder.'
      )
      const icsFile = await generateIcs(
        info,
        currentConnectedAccountAddress,
        MeetingChangeType.CREATE,
        `${appUrl}/dashboard/schedule?conferenceId=${slot.meeting_id}&intent=${Intents.UPDATE_MEETING}`
      )

      const url = window.URL.createObjectURL(
        new Blob([icsFile.value!], { type: 'text/plain' })
      )
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `meeting_${slot!.id}.ics`)

      document.body.appendChild(link)
      link.click()
      link.parentNode!.removeChild(link)
      showSuccessToast(
        'Downloaded calendar invite',
        'Ics file downloaded successfully'
      )
    } catch (e) {
      showErrorToast(
        'Download failed',
        'There was an error downloading the ics file. Please try again.'
      )
    }
  }
  const menuItems = React.useMemo(
    () => [
      {
        label: 'Add to Google Calendar',
        onClick: async () => {
          showInfoToast(
            'Opening Google Calendar',
            'A new tab will open with your Google Calendar invite.'
          )
          const url = await generateGoogleCalendarUrl(
            slot?.meeting_id || '',
            currentAccount!.address,
            slot?.start,
            slot?.end,
            slot?.title || 'No Title',
            slot?.content,
            slot?.meeting_url,
            Intl.DateTimeFormat().resolvedOptions().timeZone,
            slot?.participants
          )
          showSuccessToast(
            'Opening Link',
            'A new tab has been opened with your Google Calendar invite.'
          )
          window.open(url, '_blank', 'noopener noreferrer')
        },
      },
      {
        label: 'Add to Office 365 Calendar',
        onClick: async () => {
          showInfoToast(
            'Generating Link',
            'A new tab will open with your Office 365 calendar invite.'
          )
          const url = await generateOffice365CalendarUrl(
            slot?.meeting_id || '',
            currentAccount!.address,
            slot?.start,
            slot?.end,
            slot?.title || 'No Title',
            slot?.content,
            slot?.meeting_url,
            Intl.DateTimeFormat().resolvedOptions().timeZone,
            slot?.participants
          )
          showSuccessToast(
            'Opening Link',
            'A new tab has been opened with your Office 365 calendar invite.'
          )
          window.open(url, '_blank', 'noopener noreferrer')
        },
      },
      {
        label: 'Download calendar invite',
        isAsync: true,
        onClick: () => {
          downloadIcs(slot, currentAccount!.address)
        },
      },
    ],
    [slot, currentAccount]
  )

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

  const renderParticipantChipLabel = React.useCallback(
    (participantInfo: ParticipantInfo) => {
      const isParticipantScheduler =
        participantInfo.type === ParticipantType.Scheduler
      const isCurrentUser =
        participantInfo.account_address &&
        participantInfo.account_address.toLowerCase() ===
          currentAccount?.address?.toLowerCase()

      if (isParticipantScheduler) {
        if (isCurrentUser) {
          return 'You (Scheduler)'
        }
        const baseName =
          participantInfo.name ||
          participantInfo.guest_email ||
          ellipsizeAddress(participantInfo.account_address || '')
        return `${baseName} (Scheduler)`
      }

      return (
        participantInfo.name ||
        participantInfo.guest_email ||
        ellipsizeAddress(participantInfo.account_address || '')
      )
    },
    [currentAccount?.address]
  )
  const renderBadge = React.useCallback(
    (participantInfo: ParticipantInfo) => (
      <Badge sx={chipStyles.badge}>
        <Center>
          {renderParticipantChipLabel(participantInfo)}
          {renderRsvpStatus(participantInfo.status)}
        </Center>
      </Badge>
    ),
    [renderParticipantChipLabel]
  )
  const handleChipInputChange = () => {}
  const handleParticipantsClick = () => {}
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
              onClick={onCancelOpen}
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
        <Menu>
          <MenuButton
            as={IconButton}
            color={iconColor}
            aria-label="option"
            icon={<FaEllipsisV size={16} />}
            key={`${slot?.id}-option`}
          />
          <Portal>
            <MenuList backgroundColor={menuBgColor}>
              {menuItems.map((val, index, arr) => [
                <MenuItem
                  onClick={val.onClick}
                  backgroundColor={menuBgColor}
                  key={`${val.label}-${slot?.id}`}
                  aria-busy
                >
                  {val.label}
                </MenuItem>,
                index !== arr.length - 1 && (
                  <MenuDivider
                    key={`divider-${index}-${slot?.id}`}
                    borderColor="neutral.600"
                  />
                ),
              ])}
            </MenuList>
          </Portal>
        </Menu>
      </HStack>
      <CancelMeetingDialog
        isOpen={isCancelOpen}
        onClose={onCancelClose}
        decryptedMeeting={slot}
        currentAccount={currentAccount}
        afterCancel={() => setSelectedSlot(null)}
        // TODO: create a removed slot array to map removed slot to so we don't need to refetch all slots and can just filter them out with it
      />
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
        <FormControl>
          <FormLabel>Meeting participants</FormLabel>
          <HStack alignItems="stretch" gap={3}>
            <Box width="fit-content" flex={1}>
              <ChipInput
                currentItems={slot.participants || []}
                onChange={handleChipInputChange}
                renderItem={participant =>
                  renderParticipantChipLabel(participant)
                }
                placeholder="Add participants"
                addDisabled={!canEditMeeting}
                isReadOnly={!canEditMeeting}
                renderBadge={renderBadge}
                inputProps={
                  !canEditMeeting
                    ? {
                        display: 'none',
                      }
                    : undefined
                }
              />
            </Box>
            {canEditMeeting && (
              <IconButton
                aria-label="Add participants"
                icon={<IoPersonAddOutline size={20} />}
                onClick={handleParticipantsClick}
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
        <FormControl>
          <FormLabel>Date/Time</FormLabel>
          <HStack alignItems="stretch" gap={3}>
            <Box
              flex="1"
              cursor={canEditMeeting ? 'pointer' : 'default'}
              onClick={canEditMeeting ? handlePickNewTime : undefined}
            >
              <SingleDatepicker
                date={timezoneDate}
                onDateChange={() => undefined}
                iconColor="neutral.300"
                iconSize={20}
                disabled={!canEditMeeting}
                inputProps={{
                  py: 3,
                  pl: 12,
                  borderColor: 'neutral.400',
                  borderRadius: '6px',
                  bg: 'neutral.650',
                }}
              />
            </Box>
            <Box
              flex="1"
              cursor={canEditMeeting ? 'pointer' : 'default'}
              onClick={canEditMeeting ? handlePickNewTime : undefined}
            >
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
                  bg: 'neutral.650',
                }}
              />
            </Box>
            {canEditMeeting && (
              <IconButton
                aria-label="Edit date and time"
                icon={<MdOutlineEditCalendar size={20} />}
                onClick={handlePickNewTime}
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
          <RadioGroup
            onChange={(val: MeetingProvider) => setMeetingProvider(val)}
            value={meetingProvider}
            w={'100%'}
            isDisabled={!canEditMeeting}
          >
            <VStack w={'100%'} gap={4}>
              {meetingProviders.map(provider => (
                <Radio
                  flexDirection="row-reverse"
                  justifyContent="space-between"
                  w="100%"
                  colorScheme="primary"
                  value={provider}
                  key={provider}
                >
                  <Text
                    fontWeight="600"
                    color={'border-default-primary'}
                    cursor="pointer"
                  >
                    {renderProviderName(provider)}
                  </Text>
                </Radio>
              ))}
            </VStack>
          </RadioGroup>
          {meetingProvider === MeetingProvider.CUSTOM && (
            <Input
              type="text"
              placeholder="insert a custom meeting url"
              isDisabled={!canEditMeeting}
              my={4}
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
                border: '1px solid',
                borderTopColor: 'currentColor',
                borderLeftColor: 'currentColor',
                borderRightColor: 'currentColor',
                borderBottomColor: 'currentColor',
                borderColor: 'inherit',
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
      </VStack>
    </VStack>
  )
}

export default ActiveMeetwithEvent

import { WarningTwoIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Checkbox,
  Divider,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  Icon,
  IconButton,
  Input,
  Link,
  Radio,
  RadioGroup,
  Text,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react'
import DeleteMeetingModal from '@components/schedule/DeleteMeetingModal'
import ScheduleParticipantsOwnersModal from '@components/schedule/ScheduleParticipantsOwnersModal'
import ScheduleParticipantsSchedulerModal from '@components/schedule/ScheduleParticipantsSchedulerModal'
import {
  Select as ChakraSelect,
  Select,
  SingleValue,
} from 'chakra-react-select'
import { DateTime } from 'luxon'
import { useRouter } from 'next/router'
import {
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { FaArrowLeft, FaChevronDown } from 'react-icons/fa'
import { IoPersonAddOutline } from 'react-icons/io5'
import { MdOutlineEditCalendar } from 'react-icons/md'

import { ChipInput } from '@/components/chip-input'
import { SingleDatepicker } from '@/components/input-date-picker'
import { InputTimePicker } from '@/components/input-time-picker'
import RichTextEditor from '@/components/profile/components/RichTextEditor'
import InfoTooltip from '@/components/profile/components/Tooltip'
import DiscoverATimeInfoModal from '@/components/schedule/DiscoverATimeInfoModal'
import { IInitialProps } from '@/pages/dashboard/schedule'
import { AccountContext } from '@/providers/AccountProvider'
import { useScheduleActions } from '@/providers/schedule/ActionsContext'
import {
  Page,
  useScheduleNavigation,
} from '@/providers/schedule/NavigationContext'
import { useParticipants } from '@/providers/schedule/ParticipantsContext'
import { useParticipantPermissions } from '@/providers/schedule/PermissionsContext'
import { useScheduleState } from '@/providers/schedule/ScheduleContext'
import { MeetingReminders } from '@/types/common'
import { EditMode, Intents } from '@/types/Dashboard'
import { MeetingProvider, MeetingRepeat } from '@/types/Meeting'
import { ParticipantInfo, ParticipantType } from '@/types/ParticipantInfo'
import { isGroupParticipant, Participant } from '@/types/schedule'
import { MeetingAction } from '@/utils/constants/meeting'
import { BASE_PROVIDERS } from '@/utils/constants/meeting-types'
import {
  MeetingNotificationOptions,
  MeetingPermissions,
  MeetingRepeatOptions,
  MeetingSchedulePermissions,
} from '@/utils/constants/schedule'
import {
  getCustomSelectComponents,
  noClearCustomSelectComponent,
  Option,
} from '@/utils/constants/select'
import {
  canAccountAccessPermission,
  renderProviderName,
} from '@/utils/generic_utils'
import ParticipantService from '@/utils/participant.service'
import { getMergedParticipants } from '@/utils/schedule.helper'
import {
  ellipsizeAddress,
  getAllParticipantsDisplayName,
} from '@/utils/user_manager'
import ConfirmEditModeModal from './ConfirmEditMode'

const meetingProviders: Array<Option<MeetingProvider>> = BASE_PROVIDERS.concat(
  MeetingProvider.CUSTOM
).map(provider => ({
  value: provider,
  label: renderProviderName(provider),
}))
const ScheduleBase = () => {
  const { query } = useRouter()
  const { seriesId, meetingId } = query as IInitialProps
  const { currentAccount } = useContext(AccountContext)
  const [isTitleValid, setIsTitleValid] = useState(true)
  const toast = useToast()
  const { onOpen, isOpen, onClose } = useDisclosure()
  const {
    onOpen: onSchedulerDeleteOpen,
    isOpen: isSchedulerDeleteOpen,
    onClose: OnSchedulerDeleteClose,
  } = useDisclosure()
  const {
    onOpen: onDeleteOpen,
    isOpen: isDeleteOpen,
    onClose: OnSchedulerClose,
  } = useDisclosure()
  const { handlePageSwitch, setInviteModalOpen } = useScheduleNavigation()

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
  } = useScheduleState()
  const {
    groupParticipants,
    groups,
    meetingOwners,
    participants,
    standAloneParticipants,
    setMeetingOwners,
    setParticipants,
    setGroupParticipants,
    setGroupAvailability,
  } = useParticipants()
  const { handleCancel, handleSchedule } = useScheduleActions()
  const [currentMeetingAction, setCurrentMeetingAction] = useState<
    MeetingAction | undefined
  >(undefined)
  const {
    isOpen: isOpenEditModeConfirm,
    onOpen: onOpenEditModeConfirm,
    onClose: onCloseEditModeConfirm,
  } = useDisclosure()
  const {
    isDeleting,
    canDelete,
    canCancel,
    isScheduler,
    canEditMeetingDetails,
    isUpdatingMeeting,
  } = useParticipantPermissions()
  const [hasPickedNewTime, setHasPickedNewTime] = useState(false)
  const [openWhatIsThis, setOpenWhatIsThis] = useState(false)
  const canManageParticipants = canEditMeetingDetails && !isScheduling
  const canViewParticipants = useMemo(
    () =>
      canAccountAccessPermission(
        decryptedMeeting?.permissions,
        decryptedMeeting?.participants || [],
        currentAccount?.address,
        MeetingPermissions.SEE_GUEST_LIST
      ),
    [decryptedMeeting, currentAccount]
  )
  const handleClose = () => {
    handlePageSwitch(Page.SCHEDULE_TIME)
  }
  const mergedParticipants = useMemo(
    () =>
      getMergedParticipants(
        participants,
        groups,
        groupParticipants,
        currentAccount?.address || ''
      ),
    [participants, groups, groupParticipants]
  )

  useEffect(() => {
    const mergedParticipants = getMergedParticipants(
      participants,
      groups,
      groupParticipants
    )
    if (mergedParticipants.length > 0) {
      const filteredMeetingOwners = meetingOwners.filter(owner =>
        mergedParticipants.some(
          participant => participant.account_address === owner.account_address
        )
      )
      setMeetingOwners(filteredMeetingOwners)
    } else {
      setMeetingOwners([])
    }
  }, [participants])
  const meetingParticipants = useMemo(
    () => getMergedParticipants(participants, groups, groupParticipants),
    [participants, groups, groupParticipants]
  )

  const standAloneIdentifiers = useMemo(() => {
    const identifiers = new Set<string>()
    standAloneParticipants.forEach(participant => {
      const identifier =
        participant.account_address?.toLowerCase() ||
        participant.guest_email?.toLowerCase() ||
        participant.name?.toLowerCase()
      if (identifier) {
        identifiers.add(identifier)
      }
    })
    return identifiers
  }, [standAloneParticipants])

  useEffect(() => {
    const seenIdentifiers = new Set<string>()
    let shouldUpdate = false

    const nextParticipants: Array<Participant | ParticipantInfo> = []

    participants.forEach(participant => {
      if (isGroupParticipant(participant)) {
        const groupKey = `group-${participant.id}`
        if (seenIdentifiers.has(groupKey)) {
          shouldUpdate = true
          return
        }
        seenIdentifiers.add(groupKey)
        nextParticipants.push(participant)
        return
      }

      const participantInfo = participant as ParticipantInfo
      const identifier =
        participantInfo.account_address?.toLowerCase() ||
        participantInfo.guest_email?.toLowerCase() ||
        participantInfo.name?.toLowerCase()

      if (identifier) {
        if (seenIdentifiers.has(identifier)) {
          shouldUpdate = true
          return
        }
        seenIdentifiers.add(identifier)
      }

      const isSchedulerOrOwner =
        participantInfo.type === ParticipantType.Scheduler ||
        participantInfo.type === ParticipantType.Owner
      const shouldHide =
        isSchedulerOrOwner ||
        !(identifier && standAloneIdentifiers.has(identifier))

      if ((participantInfo.isHidden ?? false) !== shouldHide) {
        shouldUpdate = true
        nextParticipants.push({
          ...participantInfo,
          isHidden: shouldHide,
        })
        return
      }

      nextParticipants.push(participantInfo)
    })

    if (shouldUpdate || nextParticipants.length !== participants.length) {
      setParticipants(nextParticipants)
    }
  }, [participants, setParticipants, standAloneIdentifiers])
  const displayParticipants = useMemo(() => {
    const seenIdentifiers = new Set<string>()

    return meetingParticipants.reduce<Array<ParticipantInfo>>(
      (accumulator, participant) => {
        const participantInfo = participant
        const identifier =
          participantInfo.account_address?.toLowerCase() ||
          participantInfo.guest_email?.toLowerCase() ||
          participantInfo.name?.toLowerCase()

        if (identifier) {
          if (seenIdentifiers.has(identifier)) {
            return accumulator
          }
          seenIdentifiers.add(identifier)
        }

        if (participantInfo.isHidden) {
          accumulator.push({
            ...participantInfo,
            isHidden: false,
          })
          return accumulator
        }

        accumulator.push(participantInfo)
        return accumulator
      },
      []
    )
  }, [participants, groupParticipants])
  const formattedTime = useMemo(() => {
    if (!pickedTime) {
      return 'Invalid date'
    }
    return DateTime.fromJSDate(pickedTime).setZone(timezone).toFormat('hh:mm a')
  }, [pickedTime, timezone])
  const timezoneDate = useMemo(() => {
    if (!pickedTime) {
      return new Date()
    }
    return DateTime.fromJSDate(pickedTime).setZone(timezone).toJSDate()
  }, [pickedTime, timezone])
  const canModifyDateTime = useMemo(
    () => canEditMeetingDetails && !isScheduling,
    [canEditMeetingDetails, isScheduling]
  )
  const handlePickNewTime = useCallback(() => {
    if (!canModifyDateTime) {
      return
    }
    setHasPickedNewTime(true)
    handlePageSwitch(Page.SCHEDULE_TIME)
  }, [canModifyDateTime, handlePageSwitch, setHasPickedNewTime])
  const handleParticipantsClick = useCallback(() => {
    if (!canManageParticipants) {
      return
    }
    setInviteModalOpen(true)
  }, [canManageParticipants, setInviteModalOpen])
  const meetingProviderValue = useMemo(
    () => meetingProviders.find(provider => provider.value === meetingProvider),
    [meetingProvider]
  )
  const renderParticipantChipLabel = useCallback(
    (participant: Participant) =>
      currentAccount?.address
        ? ParticipantService.renderParticipantChipLabel(
            participant,
            currentAccount?.address
          )
        : '',
    [currentAccount?.address]
  )
  const handleChipInputChange = useCallback(
    (updatedItems: ParticipantInfo[]) => {
      if (!canManageParticipants) return
      const participantService = new ParticipantService(
        displayParticipants,
        updatedItems
      )

      startTransition(() => {
        setGroupParticipants(prev => participantService.handleDerivatives(prev))
        setGroupAvailability(prev => participantService.handleDerivatives(prev))
        setParticipants(prev =>
          participantService.handleParticipantUpdate(prev)
        )
      })
    },
    [canManageParticipants, displayParticipants]
  )
  const handleDeleteMeeting = useCallback(() => {
    if (seriesId || meetingId?.includes('_')) {
      setCurrentMeetingAction(MeetingAction.DELETE_MEETING)
      onOpenEditModeConfirm()
    } else {
      onDeleteOpen()
    }
  }, [onOpenEditModeConfirm, onDeleteOpen, seriesId, meetingId])
  const handleScheduleMeeting = useCallback(() => {
    if (seriesId || meetingId?.includes('_')) {
      setCurrentMeetingAction(MeetingAction.SCHEDULE_MEETING)
      onOpenEditModeConfirm()
    } else {
      handleSchedule()
    }
  }, [handleSchedule, onOpenEditModeConfirm, seriesId, meetingId])
  const handleCancelMeeting = useCallback(() => {
    if (seriesId || meetingId?.includes('_')) {
      setCurrentMeetingAction(MeetingAction.CANCEL_MEETING)
      onOpenEditModeConfirm()
    } else {
      handleCancel()
    }
  }, [handleCancel, onOpenEditModeConfirm, seriesId, meetingId])
  const handleActionAfterEditModeConfirm = useCallback(() => {
    if (currentMeetingAction === MeetingAction.SCHEDULE_MEETING) {
      handleSchedule()
    } else if (currentMeetingAction === MeetingAction.CANCEL_MEETING) {
      handleCancel()
    } else if (currentMeetingAction === MeetingAction.DELETE_MEETING) {
      onDeleteOpen()
    }
    setCurrentMeetingAction(undefined)
  }, [currentMeetingAction, handleSchedule, handleCancel, onDeleteOpen])
  const _onChangeProvider = (
    newValue: SingleValue<Option<MeetingProvider>>
  ) => {
    setMeetingProvider(newValue?.value || MeetingProvider.CUSTOM)
  }
  return (
    <Box w="100%">
      <DiscoverATimeInfoModal
        isOpen={openWhatIsThis}
        key={'discover-a-time-info-modal'}
        onClose={() => setOpenWhatIsThis(false)}
      />
      <ScheduleParticipantsOwnersModal
        isOpen={isOpen}
        key="schedule-participants-owners-modal"
        onClose={onClose}
        participants={mergedParticipants}
      />
      <ScheduleParticipantsSchedulerModal
        isOpen={isSchedulerDeleteOpen}
        onClose={OnSchedulerDeleteClose}
        participants={mergedParticipants}
      />
      <DeleteMeetingModal
        isOpen={isDeleteOpen}
        isScheduler={isScheduler}
        onClose={OnSchedulerClose}
        openSchedulerModal={onSchedulerDeleteOpen}
      />
      <ConfirmEditModeModal
        afterClose={handleActionAfterEditModeConfirm}
        isOpen={isOpenEditModeConfirm}
        onClose={onCloseEditModeConfirm}
      />
      <VStack
        alignItems="flex-start"
        gap={6}
        m="auto"
        w={{
          base: '90%',
          md: '600px',
        }}
      >
        <VStack alignItems="flex-start" gap={4} width="100%">
          {isUpdatingMeeting && !hasPickedNewTime ? (
            <Link href={`/dashboard/${EditMode.MEETINGS}`}>
              <HStack alignItems="flex-start" cursor="pointer" mb={0}>
                <Icon as={FaArrowLeft} color={'primary.500'} size="1.5em" />
                <Heading color="primary.500" fontSize={16}>
                  Back
                </Heading>
              </HStack>
            </Link>
          ) : (
            <HStack
              alignItems="flex-start"
              cursor="pointer"
              mb={0}
              onClick={handleClose}
            >
              <Icon as={FaArrowLeft} color={'primary.500'} size="1.5em" />
              <Heading color="primary.500" fontSize={16}>
                Back
              </Heading>
            </HStack>
          )}
          {!canEditMeetingDetails && (
            <HStack
              bg={'yellow.300'}
              borderRadius={'6px'}
              color={'neutral.900'}
              gap={3}
              px={4}
              py={3}
            >
              <WarningTwoIcon h={5} w={5} />
              <Text fontWeight="500">
                You do not have permission to edit this meeting.
              </Text>
            </HStack>
          )}
        </VStack>
        <Divider borderColor="neutral.400" w={{ base: '100%', md: '80%' }} />

        <VStack alignItems="flex-start" gap={6} w={{ base: '100%', md: '80%' }}>
          <Heading fontSize="x-large">
            {query.intent === Intents.UPDATE_MEETING
              ? 'Update meeting'
              : 'Meeting information'}
          </Heading>
          <VStack gap={4} width="100%">
            <FormControl>
              <FormLabel>Meeting participants</FormLabel>
              <HStack alignItems="stretch" gap={3}>
                {canViewParticipants ? (
                  <Box
                    flex="1"
                    sx={{
                      '& > div': {
                        borderWidth: '1px',
                        borderColor: 'neutral.400',
                        borderRadius: '6px',
                        backgroundColor: 'neutral.650',
                        alignItems: 'center',
                      },
                    }}
                  >
                    <ChipInput
                      addDisabled={!canManageParticipants}
                      currentItems={displayParticipants}
                      isReadOnly={!canManageParticipants}
                      onChange={handleChipInputChange}
                      placeholder="Add participants"
                      renderItem={participant =>
                        renderParticipantChipLabel(participant as Participant)
                      }
                    />
                  </Box>
                ) : (
                  <Flex
                    alignItems="center"
                    bg="neutral.650"
                    borderColor="neutral.400"
                    borderRadius="6px"
                    borderWidth={1}
                    flex="1"
                    px={3}
                    py={2}
                  >
                    <Text color="neutral.400">
                      {getAllParticipantsDisplayName(
                        meetingParticipants,
                        currentAccount?.address,
                        canViewParticipants
                      )}
                    </Text>
                  </Flex>
                )}
                <IconButton
                  _hover={{
                    bg: 'primary.300',
                  }}
                  aria-label="Add participants"
                  bg="primary.200"
                  borderRadius="6px"
                  color="neutral.900"
                  icon={<IoPersonAddOutline size={20} />}
                  isDisabled={!canManageParticipants}
                  onClick={handleParticipantsClick}
                />
              </HStack>
            </FormControl>
            <FormControl>
              <FormLabel>Date/Time</FormLabel>
              <HStack alignItems="stretch" gap={3}>
                <Box
                  cursor={canModifyDateTime ? 'pointer' : 'default'}
                  flex="1"
                  onClick={canModifyDateTime ? handlePickNewTime : undefined}
                >
                  <SingleDatepicker
                    date={timezoneDate}
                    iconColor="neutral.300"
                    iconSize={20}
                    inputProps={{
                      py: 3,
                      pl: 12,
                      borderColor: 'neutral.400',
                      borderRadius: '6px',
                      bg: 'neutral.650',
                    }}
                    onDateChange={() => undefined}
                  />
                </Box>
                <Box
                  cursor={canModifyDateTime ? 'pointer' : 'default'}
                  flex="1"
                  onClick={canModifyDateTime ? handlePickNewTime : undefined}
                >
                  <InputTimePicker
                    currentDate={timezoneDate}
                    iconColor="neutral.300"
                    iconSize={20}
                    inputProps={{
                      py: 3,
                      pl: 12,
                      borderColor: 'neutral.400',
                      borderRadius: '6px',
                      bg: 'neutral.650',
                    }}
                    onChange={() => undefined}
                    value={formattedTime}
                  />
                </Box>
                <IconButton
                  _hover={{
                    bg: 'primary.300',
                  }}
                  aria-label="Edit date and time"
                  bg="primary.200"
                  borderRadius="6px"
                  color="neutral.900"
                  icon={<MdOutlineEditCalendar size={20} />}
                  isDisabled={!canModifyDateTime}
                  onClick={handlePickNewTime}
                />
              </HStack>
            </FormControl>
            <Flex gap={4} width="100%">
              <FormControl
                isDisabled={!canEditMeetingDetails || isScheduling}
                isInvalid={!isTitleValid}
              >
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
                  <FormHelperText color="red.500">
                    Title is required
                  </FormHelperText>
                )}
              </FormControl>
            </Flex>
            <FormControl isDisabled={!canEditMeetingDetails || isScheduling}>
              <FormLabel htmlFor="info">Description (optional)</FormLabel>
              <RichTextEditor
                id="info"
                isDisabled={!canEditMeetingDetails || isScheduling}
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
                  onChange={e => setMeetingUrl(e.target.value)}
                  placeholder="insert a custom meeting url"
                  type="text"
                  value={meetingUrl}
                />
              )}
            </FormControl>

            <FormControl
              isDisabled={!canEditMeetingDetails || isScheduling}
              maxW="100%"
              w="100%"
            >
              <FormLabel>Meeting Reminders</FormLabel>
              <ChakraSelect
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
                className="noLeftBorder timezone-select"
                colorScheme="gray"
                components={noClearCustomSelectComponent}
                isDisabled={!canEditMeetingDetails || isScheduling}
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
            {!seriesId && (
              <FormControl
                isDisabled={!canEditMeetingDetails || isScheduling}
                maxW="100%"
                w="100%"
              >
                <FormLabel>Meeting Repeat</FormLabel>
                <ChakraSelect
                  chakraStyles={{
                    container: provided => ({
                      ...provided,
                      borderColor: 'inherit',
                      borderRadius: 'md',
                      maxW: '100%',
                      display: 'block',
                    }),
                    placeholder: provided => ({
                      ...provided,
                      textAlign: 'left',
                    }),
                    input: provided => ({
                      ...provided,
                      textAlign: 'left',
                    }),
                    control: provided => ({
                      ...provided,
                      textAlign: 'left',
                    }),
                  }}
                  className="noLeftBorder timezone-select"
                  colorScheme="primary"
                  components={noClearCustomSelectComponent}
                  isDisabled={!canEditMeetingDetails || isScheduling}
                  onChange={newValue =>
                    setMeetingRepeat(
                      newValue as {
                        value: MeetingRepeat
                        label: string
                      }
                    )
                  }
                  options={MeetingRepeatOptions}
                  value={meetingRepeat}
                />
              </FormControl>
            )}

            {isScheduler && (
              <VStack alignItems="flex-start" gap={4} w="100%">
                <Heading fontSize="lg" fontWeight={500}>
                  Permissions for guests
                </Heading>

                {MeetingSchedulePermissions.map(permission => (
                  <Checkbox
                    color="border-default-primary"
                    colorScheme="primary"
                    flexDir="row-reverse"
                    fontSize="16px"
                    fontWeight={700}
                    isChecked={selectedPermissions?.includes(permission.value)}
                    justifyContent={'space-between'}
                    key={permission.value}
                    marginInlineStart={0}
                    onChange={e => {
                      const { checked } = e.target
                      setSelectedPermissions(prev =>
                        checked
                          ? (prev || []).concat(permission.value)
                          : prev?.filter(p => p !== permission.value) || []
                      )
                    }}
                    p={0}
                    size={'lg'}
                    w="100%"
                  >
                    <HStack gap={0} marginInlineStart={-2}>
                      <Text>{permission.label}</Text>
                      {permission.info && (
                        <InfoTooltip text={permission.info} />
                      )}
                    </HStack>
                  </Checkbox>
                ))}
                <FormControl>
                  <FormLabel
                    alignItems="center"
                    display="flex"
                    fontSize="medium"
                  >
                    Make other participants meeting owners
                    <InfoTooltip text="Granting ownership will allow them to manage the meeting" />
                  </FormLabel>
                  <Button
                    _hover={{
                      textDecoration: 'none',
                    }}
                    bg="transparent"
                    borderColor="inherit"
                    borderRadius="0.375rem"
                    borderWidth={1}
                    color={meetingOwners.length > 0 ? 'white' : 'neutral.400'}
                    cursor={'pointer'}
                    fontSize="16"
                    fontWeight="400"
                    height={10}
                    justifyContent="space-between"
                    onClick={onOpen}
                    px={4}
                    textDecor="none"
                    variant="link"
                    width="100%"
                  >
                    <Text userSelect="none">
                      {meetingOwners.length > 0
                        ? meetingOwners
                            .map(
                              owner =>
                                owner.name ||
                                ellipsizeAddress(owner.account_address || '')
                            )
                            .join(', ')
                        : 'Add Participants'}
                    </Text>
                    <Icon as={FaChevronDown} h={4} w={4} />
                  </Button>
                </FormControl>
              </VStack>
            )}
            <HStack flexWrap="wrap" w="100%">
              <Button
                colorScheme="primary"
                flex={1}
                flexBasis="50%"
                h={'auto'}
                isDisabled={
                  participants.length === 0 ||
                  !title ||
                  !duration ||
                  !pickedTime ||
                  !canEditMeetingDetails
                }
                isLoading={isScheduling}
                onClick={handleScheduleMeeting}
                py={3}
                w="100%"
              >
                {query.intent === Intents.UPDATE_MEETING
                  ? 'Update Meeting'
                  : 'Schedule now'}
              </Button>
              {query.intent === Intents.UPDATE_MEETING && canCancel && (
                <Button
                  _hover={{
                    bg: 'red.500',
                    color: 'white',
                  }}
                  bg="transparent"
                  borderColor="red.500"
                  borderWidth={1}
                  color="red.500"
                  flex={1}
                  flexBasis="40%"
                  h={'auto'}
                  onClick={handleCancelMeeting}
                  py={3}
                  variant="outline"
                  w="100%"
                >
                  Cancel Meeting
                </Button>
              )}
              {query.intent === Intents.UPDATE_MEETING && canDelete && (
                <Button
                  _hover={{
                    opacity: 0.75,
                  }}
                  bg={'orangeButton.800'}
                  color={'white'}
                  flex={1}
                  flexBasis="40%"
                  h={'auto'}
                  isLoading={isDeleting}
                  onClick={handleDeleteMeeting}
                  py={3}
                  w="100%"
                >
                  Delete Meeting
                </Button>
              )}
            </HStack>
          </VStack>
        </VStack>
      </VStack>
    </Box>
  )
}

export default ScheduleBase

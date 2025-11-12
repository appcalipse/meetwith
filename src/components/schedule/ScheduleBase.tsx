/* eslint-disable tailwindcss/no-custom-classname */
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
import { Select as ChakraSelect } from 'chakra-react-select'
import { DateTime } from 'luxon'
import { useRouter } from 'next/router'
import React, {
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
import { NO_GROUP_KEY } from '@/utils/constants/group'
import { BASE_PROVIDERS } from '@/utils/constants/meeting-types'
import {
  MeetingNotificationOptions,
  MeetingPermissions,
  MeetingRepeatOptions,
  MeetingSchedulePermissions,
} from '@/utils/constants/schedule'
import { noClearCustomSelectComponent } from '@/utils/constants/select'
import {
  canAccountAccessPermission,
  deduplicateArray,
  renderProviderName,
} from '@/utils/generic_utils'
import { getMergedParticipants } from '@/utils/schedule.helper'
import {
  ellipsizeAddress,
  getAllParticipantsDisplayName,
} from '@/utils/user_manager'

const ScheduleBase = () => {
  const { query } = useRouter()
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
    removeGroup,
    setGroupParticipants,
    setGroupAvailability,
    groupAvailability,
  } = useParticipants()
  const { handleCancel, handleSchedule } = useScheduleActions()
  const {
    isDeleting,
    canDelete,
    canCancel,
    isScheduler,
    canEditMeetingDetails,
    isUpdatingMeeting,
  } = useParticipantPermissions()
  const [hasPickedNewTime, setHasPickedNewTime] = useState(false)
  const meetingProviders = BASE_PROVIDERS.concat(MeetingProvider.CUSTOM)
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

    return participants.reduce<Array<Participant | ParticipantInfo>>(
      (accumulator, participant) => {
        if (isGroupParticipant(participant)) {
          const groupKey = `group-${participant.id}`
          if (seenIdentifiers.has(groupKey)) {
            return accumulator
          }
          seenIdentifiers.add(groupKey)
          accumulator.push(participant)
          return accumulator
        }

        const participantInfo = participant as ParticipantInfo
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
  }, [participants])
  const formattedDate = useMemo(() => {
    if (!pickedTime) {
      return 'Invalid date'
    }
    return DateTime.fromJSDate(pickedTime)
      .setZone(timezone)
      .toFormat('MM/dd/yyyy')
  }, [pickedTime, timezone])
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
  const getParticipantIdentifier = useCallback((participant: Participant) => {
    if (isGroupParticipant(participant)) {
      return `group-${participant.id}`
    }
    return (
      participant.account_address?.toLowerCase() ||
      participant.guest_email?.toLowerCase() ||
      participant.name?.toLowerCase() ||
      ''
    )
  }, [])
  const renderParticipantChipLabel = useCallback(
    (participant: Participant) => {
      if (isGroupParticipant(participant)) {
        return participant.name
      }
      const participantInfo = participant as ParticipantInfo
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
  const handleChipInputChange = useCallback(
    (updatedItems: ParticipantInfo[]) => {
      if (!canManageParticipants) {
        return
      }
      const updatedList = updatedItems as unknown as Array<
        Participant | ParticipantInfo
      >
      const updatedIdentifiers = new Set(
        updatedList.map(participant =>
          getParticipantIdentifier(participant as Participant)
        )
      )

      const removedItems = displayParticipants.filter(participant => {
        const identifier = getParticipantIdentifier(participant)
        return identifier && !updatedIdentifiers.has(identifier)
      })

      const removedGroupIds = removedItems
        .filter(isGroupParticipant)
        .map(group => group.id)

      const removedParticipantIdentifiers = new Set(
        removedItems
          .filter(participant => !isGroupParticipant(participant))
          .map(getParticipantIdentifier)
      )

      const removedParticipantAddresses = new Set(
        removedItems
          .filter(
            (participant): participant is ParticipantInfo =>
              !isGroupParticipant(participant) && !!participant.account_address
          )
          .map(participant => participant.account_address!.toLowerCase())
      )

      const addedItems = updatedList.filter(participant => {
        const identifier = getParticipantIdentifier(participant as Participant)
        if (!identifier) {
          return false
        }
        return !displayParticipants.some(
          existing => getParticipantIdentifier(existing) === identifier
        )
      })

      if (removedGroupIds.length > 0) {
        removedGroupIds.forEach(removeGroup)
      }

      if (removedParticipantIdentifiers.size > 0) {
        setParticipants(prev =>
          prev.filter(existingParticipant => {
            if (isGroupParticipant(existingParticipant)) {
              return !removedGroupIds.includes(existingParticipant.id)
            }
            const identifier = getParticipantIdentifier(existingParticipant)
            return !removedParticipantIdentifiers.has(identifier)
          })
        )
        setGroupParticipants(prev => {
          const updated = { ...prev }
          Object.keys(updated).forEach(key => {
            const participantsForGroup = updated[key]?.filter(address => {
              if (!address) return false
              return !removedParticipantAddresses.has(address.toLowerCase())
            })
            if (participantsForGroup && participantsForGroup.length > 0) {
              updated[key] = participantsForGroup
            } else {
              delete updated[key]
            }
          })
          return updated
        })
        setGroupAvailability(prev => {
          const updated = { ...prev }
          Object.keys(updated).forEach(key => {
            const availabilityForGroup = updated[key]?.filter(address => {
              if (!address) return false
              return !removedParticipantAddresses.has(address.toLowerCase())
            })
            if (availabilityForGroup && availabilityForGroup.length > 0) {
              updated[key] = availabilityForGroup
            } else {
              delete updated[key]
            }
          })
          return updated
        })
      }

      if (addedItems.length > 0) {
        const participantsToAdd = addedItems.filter(
          (participant): participant is ParticipantInfo =>
            !isGroupParticipant(participant as Participant)
        )

        if (participantsToAdd.length > 0) {
          setParticipants(prev => {
            const existingIdentifiers = new Set(
              prev.map(existing =>
                getParticipantIdentifier(existing as Participant)
              )
            )
            const newParticipants = participantsToAdd
              .map(participant => ({
                ...participant,
                isHidden: false,
              }))
              .filter(participant => {
                const identifier = getParticipantIdentifier(
                  participant as Participant
                )
                if (!identifier || existingIdentifiers.has(identifier)) {
                  return false
                }
                existingIdentifiers.add(identifier)
                return true
              })
            return [...prev, ...newParticipants]
          })

          const newAddresses = participantsToAdd
            .map(participant => participant.account_address?.toLowerCase())
            .filter((address): address is string => !!address)

          if (newAddresses.length > 0) {
            setGroupParticipants(prev => ({
              ...prev,
              [NO_GROUP_KEY]: deduplicateArray([
                ...(prev[NO_GROUP_KEY] || []),
                ...newAddresses,
              ]),
            }))
            setGroupAvailability(prev => ({
              ...prev,
              [NO_GROUP_KEY]: deduplicateArray([
                ...(prev[NO_GROUP_KEY] || []),
                ...newAddresses,
              ]),
            }))
          }
        }
      }
    },
    [
      canManageParticipants,
      displayParticipants,
      getParticipantIdentifier,
      removeGroup,
      setGroupParticipants,
      setGroupAvailability,
      setParticipants,
    ]
  )
  return (
    <Box w="100%">
      <DiscoverATimeInfoModal
        isOpen={openWhatIsThis}
        onClose={() => setOpenWhatIsThis(false)}
        key={'discover-a-time-info-modal'}
      />
      <ScheduleParticipantsOwnersModal
        isOpen={isOpen}
        onClose={onClose}
        participants={mergedParticipants}
        key="schedule-participants-owners-modal"
      />
      <ScheduleParticipantsSchedulerModal
        isOpen={isSchedulerDeleteOpen}
        onClose={OnSchedulerDeleteClose}
        participants={mergedParticipants}
      />
      <DeleteMeetingModal
        onClose={OnSchedulerClose}
        isOpen={isDeleteOpen}
        isScheduler={isScheduler}
        openSchedulerModal={onSchedulerDeleteOpen}
      />

      <VStack
        gap={6}
        w={{
          base: '90%',
          md: '600px',
        }}
        m="auto"
        alignItems="flex-start"
      >
        <VStack gap={4} width="100%" alignItems="flex-start">
          {isUpdatingMeeting && !hasPickedNewTime ? (
            <Link href={`/dashboard/${EditMode.GROUPS}`}>
              <HStack alignItems="flex-start" mb={0} cursor="pointer">
                <Icon as={FaArrowLeft} size="1.5em" color={'primary.500'} />
                <Heading fontSize={16} color="primary.500">
                  Back
                </Heading>
              </HStack>
            </Link>
          ) : (
            <HStack
              alignItems="flex-start"
              mb={0}
              cursor="pointer"
              onClick={handleClose}
            >
              <Icon as={FaArrowLeft} size="1.5em" color={'primary.500'} />
              <Heading fontSize={16} color="primary.500">
                Back
              </Heading>
            </HStack>
          )}
          {!canEditMeetingDetails && (
            <HStack
              bg={'yellow.300'}
              color={'neutral.900'}
              py={3}
              px={4}
              gap={3}
              borderRadius={'6px'}
            >
              <WarningTwoIcon w={5} h={5} />
              <Text fontWeight="500">
                You do not have permission to edit this meeting.
              </Text>
            </HStack>
          )}
        </VStack>
        <Divider borderColor="neutral.400" w={{ base: '100%', md: '80%' }} />

        <VStack w={{ base: '100%', md: '80%' }} gap={6} alignItems="flex-start">
          <Heading fontSize="x-large">
            {query.intent === Intents.UPDATE_MEETING
              ? 'Update meeting'
              : 'Meeting information'}
          </Heading>
          <VStack width="100%" gap={4}>
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
                      currentItems={displayParticipants}
                      onChange={handleChipInputChange}
                      renderItem={participant =>
                        renderParticipantChipLabel(participant as Participant)
                      }
                      placeholder="Add participants"
                      addDisabled={!canManageParticipants}
                      isReadOnly={!canManageParticipants}
                    />
                  </Box>
                ) : (
                  <Flex
                    flex="1"
                    borderWidth={1}
                    borderColor="neutral.400"
                    borderRadius="6px"
                    bg="neutral.650"
                    px={3}
                    py={2}
                    alignItems="center"
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
                  aria-label="Add participants"
                  icon={<IoPersonAddOutline size={20} />}
                  onClick={handleParticipantsClick}
                  isDisabled={!canManageParticipants}
                  bg="primary.200"
                  color="neutral.900"
                  borderRadius="6px"
                  _hover={{
                    bg: 'primary.300',
                  }}
                />
              </HStack>
            </FormControl>
            <FormControl>
              <FormLabel>Date/Time</FormLabel>
              <HStack alignItems="stretch" gap={3}>
                <Box
                  flex="1"
                  cursor={canModifyDateTime ? 'pointer' : 'default'}
                  onClick={canModifyDateTime ? handlePickNewTime : undefined}
                >
                  <SingleDatepicker
                    date={timezoneDate}
                    onDateChange={() => undefined}
                    iconColor="neutral.300"
                    iconSize={20}
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
                  cursor={canModifyDateTime ? 'pointer' : 'default'}
                  onClick={canModifyDateTime ? handlePickNewTime : undefined}
                >
                  <InputTimePicker
                    currentDate={timezoneDate}
                    value={formattedTime}
                    onChange={() => undefined}
                    iconColor="neutral.300"
                    iconSize={20}
                    inputProps={{
                      py: 3,
                      pl: 12,
                      borderColor: 'neutral.400',
                      borderRadius: '6px',
                      bg: 'neutral.650',
                    }}
                  />
                </Box>
                <IconButton
                  aria-label="Edit date and time"
                  icon={<MdOutlineEditCalendar size={20} />}
                  onClick={handlePickNewTime}
                  isDisabled={!canModifyDateTime}
                  bg="primary.200"
                  color="neutral.900"
                  borderRadius="6px"
                  _hover={{
                    bg: 'primary.300',
                  }}
                />
              </HStack>
            </FormControl>
            <Flex width="100%" gap={4}>
              <FormControl
                isInvalid={!isTitleValid}
                isDisabled={!canEditMeetingDetails || isScheduling}
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
                value={content}
                onValueChange={setContent}
                placeholder="Any information you want to share prior to the meeting?"
                isDisabled={!canEditMeetingDetails || isScheduling}
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
                isDisabled={!canEditMeetingDetails || isScheduling}
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
                  isDisabled={isScheduling}
                  my={4}
                  value={meetingUrl}
                  onChange={e => setMeetingUrl(e.target.value)}
                />
              )}
            </VStack>

            <FormControl
              w="100%"
              maxW="100%"
              isDisabled={!canEditMeetingDetails || isScheduling}
            >
              <FormLabel>Meeting Reminders</FormLabel>
              <ChakraSelect
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
            <FormControl
              w="100%"
              maxW="100%"
              isDisabled={!canEditMeetingDetails || isScheduling}
            >
              <FormLabel>Meeting Repeat</FormLabel>
              <ChakraSelect
                value={meetingRepeat}
                colorScheme="primary"
                onChange={newValue =>
                  setMeetingRepeat(
                    newValue as {
                      value: MeetingRepeat
                      label: string
                    }
                  )
                }
                // eslint-disable-next-line tailwindcss/no-custom-classname
                className="noLeftBorder timezone-select"
                options={MeetingRepeatOptions}
                components={noClearCustomSelectComponent}
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
              />
            </FormControl>

            {isScheduler && (
              <VStack w="100%" gap={4} alignItems="flex-start">
                <Heading fontSize="lg" fontWeight={500}>
                  Permissions for guests
                </Heading>

                {MeetingSchedulePermissions.map(permission => (
                  <Checkbox
                    key={permission.value}
                    isChecked={selectedPermissions?.includes(permission.value)}
                    w="100%"
                    colorScheme="primary"
                    flexDir="row-reverse"
                    justifyContent={'space-between'}
                    fontWeight={700}
                    color="border-default-primary"
                    fontSize="16px"
                    size={'lg'}
                    p={0}
                    marginInlineStart={0}
                    onChange={e => {
                      const { checked } = e.target
                      setSelectedPermissions(prev =>
                        checked
                          ? (prev || []).concat(permission.value)
                          : prev?.filter(p => p !== permission.value) || []
                      )
                    }}
                  >
                    <HStack marginInlineStart={-2} gap={0}>
                      <Text>{permission.label}</Text>
                      {permission.info && (
                        <InfoTooltip text={permission.info} />
                      )}
                    </HStack>
                  </Checkbox>
                ))}
                <FormControl>
                  <FormLabel
                    display="flex"
                    alignItems="center"
                    fontSize="medium"
                  >
                    Make other participants meeting owners
                    <InfoTooltip text="Granting ownership will allow them to manage the meeting" />
                  </FormLabel>
                  <Button
                    onClick={onOpen}
                    borderColor="inherit"
                    borderWidth={1}
                    cursor="pointer"
                    color={meetingOwners.length > 0 ? 'white' : 'neutral.400'}
                    justifyContent="space-between"
                    borderRadius="0.375rem"
                    height={10}
                    fontSize="16"
                    px={4}
                    width="100%"
                    bg="transparent"
                    variant="link"
                    textDecor="none"
                    fontWeight="400"
                    _hover={{
                      textDecoration: 'none',
                    }}
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
                    <Icon as={FaChevronDown} w={4} h={4} />
                  </Button>
                </FormControl>
              </VStack>
            )}
            <HStack w="100%" flexWrap="wrap">
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
                  participants.length === 0 ||
                  !title ||
                  !duration ||
                  !pickedTime ||
                  !canEditMeetingDetails
                }
              >
                {query.intent === Intents.UPDATE_MEETING
                  ? 'Update Meeting'
                  : 'Schedule now'}
              </Button>
              {query.intent === Intents.UPDATE_MEETING && canCancel && (
                <Button
                  w="100%"
                  py={3}
                  h={'auto'}
                  borderColor="red.500"
                  borderWidth={1}
                  color="red.500"
                  bg="transparent"
                  onClick={handleCancel}
                  variant="outline"
                  flex={1}
                  flexBasis="40%"
                  _hover={{
                    bg: 'red.500',
                    color: 'white',
                  }}
                >
                  Cancel Meeting
                </Button>
              )}
              {query.intent === Intents.UPDATE_MEETING && canDelete && (
                <Button
                  w="100%"
                  py={3}
                  h={'auto'}
                  onClick={onDeleteOpen}
                  color={'white'}
                  bg={'orangeButton.800'}
                  _hover={{
                    opacity: 0.75,
                  }}
                  isLoading={isDeleting}
                  flex={1}
                  flexBasis="40%"
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

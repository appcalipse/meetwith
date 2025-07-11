import { AddIcon, InfoIcon, WarningTwoIcon } from '@chakra-ui/icons'
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
  Input,
  Radio,
  RadioGroup,
  Select,
  Text,
  useColorModeValue,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react'
import DeleteMeetingModal from '@components/schedule/DeleteMeetingModal'
import ScheduleParticipantsOwnersModal from '@components/schedule/ScheduleParticipantsOwnersModal'
import ScheduleParticipantsSchedulerModal from '@components/schedule/ScheduleParticipantsSchedulerModal'
import { Select as ChakraSelect } from 'chakra-react-select'
import { format } from 'date-fns'
import { useRouter } from 'next/router'
import React, { useContext, useEffect, useMemo, useState } from 'react'
import { FaChevronDown } from 'react-icons/fa'

import { ChipInput } from '@/components/chip-input'
import { SingleDatepicker } from '@/components/input-date-picker'
import { InputTimePicker } from '@/components/input-time-picker'
import RichTextEditor from '@/components/profile/components/RichTextEditor'
import InfoTooltip from '@/components/profile/components/Tooltip'
import DiscoverATimeInfoModal from '@/components/schedule/DiscoverATimeInfoModal'
import ScheduleGroupModal from '@/components/schedule/ScheduleGroupModal'
import { Page, ScheduleContext } from '@/pages/dashboard/schedule'
import { AccountContext } from '@/providers/AccountProvider'
import { MeetingReminders } from '@/types/common'
import { Intents } from '@/types/Dashboard'
import { MeetingProvider, MeetingRepeat } from '@/types/Meeting'
import { ParticipantInfo } from '@/types/ParticipantInfo'
import { isGroupParticipant, Participant } from '@/types/schedule'
import { durationToHumanReadable } from '@/utils/calendar_manager'
import {
  DEFAULT_GROUP_SCHEDULING_DURATION,
  MeetingNotificationOptions,
  MeetingRepeatOptions,
  MeetingSchedulePermissions,
} from '@/utils/constants/schedule'
import { noClearCustomSelectComponent } from '@/utils/constants/select'
import { renderProviderName } from '@/utils/generic_utils'
import { getMergedParticipants } from '@/utils/schedule.helper'
import { ellipsizeAddress } from '@/utils/user_manager'

const ScheduleBase = () => {
  const { query } = useRouter()
  const { currentAccount } = useContext(AccountContext)
  const [isTitleValid, setIsTitleValid] = useState(true)
  const [isDurationValid, setIsDurationValid] = useState(true)
  const [isParticipantsValid, setIsParticipantsValid] = useState(true)
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
  const {
    participants,
    setParticipants,
    duration,
    title,
    content,
    handleContentChange,
    handleDurationChange,
    handleTitleChange,
    handlePageSwitch,
    handleSchedule,
    pickedTime,
    handleTimePick,
    isScheduling,
    meetingProvider,
    meetingUrl,
    setMeetingProvider,
    setMeetingUrl,
    setGroupAvailability,
    meetingNotification,
    setMeetingNotification,
    meetingRepeat,
    setMeetingRepeat,
    setGroupParticipants,
    handleCancel,
    isDeleting,
    canDelete,
    isScheduler,
    selectedPermissions,
    setSelectedPermissions,
    groups,
    groupParticipants,
    meetingOwners,
    setMeetingOwners,
    canEditMeetingDetails,
  } = useContext(ScheduleContext)
  const handleSubmit = () => {
    if (!title) {
      setIsTitleValid(false)
    } else {
      setIsTitleValid(true)
    }
    if (!duration) {
      setIsDurationValid(false)
    } else {
      setIsDurationValid(true)
    }
    if (participants.length === 0) {
      setIsParticipantsValid(false)
    } else {
      setIsParticipantsValid(true)
    }
    if (!title || !duration || participants.length === 0) {
      return
    }
    handlePageSwitch(Page.SCHEDULE_TIME)
  }
  const {
    isOpen: isGroupModalOpen,
    onOpen: openGroupModal,
    onClose: closeGroupModal,
  } = useDisclosure()
  const meetingProviders = (
    currentAccount?.preferences?.meetingProviders || []
  ).concat(MeetingProvider.CUSTOM)
  const [openWhatIsThis, setOpenWhatIsThis] = useState(false)
  const iconColor = useColorModeValue('gray.800', 'white')
  const onParticipantsChange = (_participants: Array<ParticipantInfo>) => {
    setParticipants(_prev => {
      const oldGroups = _prev.filter(_participantOld =>
        isGroupParticipant(_participantOld)
      )

      oldGroups.forEach(oldGroup => {
        const participants = _participants.filter(_participantOld =>
          isGroupParticipant(_participantOld)
        )
        const isGroupExist = participants.find(val => val.id === oldGroup.id)
        if (!isGroupExist) {
          setGroupParticipants(prev => ({
            ...prev,
            [oldGroup.id]: [],
          }))
          setGroupAvailability(prev => ({
            ...prev,
            [oldGroup.id]: [],
          }))
        }
      })
      return _participants as Array<Participant>
    })
    if (_participants.length) {
      setIsParticipantsValid(true)
    }
    const key = 'no_group'
    const addresses = _participants
      .map(val => val.account_address)
      .filter(val => val != undefined)
    setGroupAvailability(prev => ({
      ...prev,
      [key]: addresses as string[],
    }))
    setGroupParticipants(prev => ({
      ...prev,
      [key]: addresses as string[],
    }))
  }

  const type = useMemo(
    () =>
      currentAccount?.preferences.availableTypes.find(
        type => type.duration_minutes === duration
      ),
    [duration]
  )

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
    const type = currentAccount?.preferences.availableTypes.find(
      type => type.duration_minutes === duration
    )
    if (type?.custom_link) {
      setMeetingProvider(MeetingProvider.CUSTOM)
      setMeetingUrl(type.custom_link)
    }
  }, [currentAccount, duration])

  useEffect(() => {
    if (participants.length > 0) {
      setIsParticipantsValid(true)
    }
    const mergedParticipants = getMergedParticipants(
      participants,
      groups,
      groupParticipants,
      currentAccount?.address || ''
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

  return (
    <Box>
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
      <ScheduleGroupModal onClose={closeGroupModal} isOpen={isGroupModalOpen} />

      <VStack
        gap={6}
        width="fit-content"
        maxW={{
          base: '100%',
          md: '600px',
        }}
        m="auto"
        alignItems="flex-start"
      >
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
        <Heading fontSize="x-large">
          {query.intent === Intents.UPDATE_MEETING
            ? 'Update meeting'
            : 'Schedule new meeting'}
        </Heading>
        <VStack width="100%" gap={4}>
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
                  return handleTitleChange(e.target.value)
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
            <FormControl
              w={'max-content'}
              isDisabled={!canEditMeetingDetails || isScheduling}
            >
              <FormLabel htmlFor="date">
                Duration
                <Text color="red.500" display="inline">
                  *
                </Text>
              </FormLabel>
              <Select
                id="duration"
                placeholder="Duration"
                onChange={e => handleDurationChange(Number(e.target.value))}
                value={duration}
                borderColor="neutral.400"
                width={'max-content'}
                maxW="350px"
                isInvalid={!isDurationValid}
                errorBorderColor="red.500"
              >
                {DEFAULT_GROUP_SCHEDULING_DURATION.map(type => (
                  <option key={type.id} value={type.duration}>
                    {durationToHumanReadable(type.duration)}
                  </option>
                ))}
              </Select>
              {!isDurationValid && (
                <FormHelperText color="red.500">
                  Duration is required
                </FormHelperText>
              )}
            </FormControl>
          </Flex>
          <FormControl
            w="100%"
            maxW="100%"
            isDisabled={!canEditMeetingDetails || isScheduling}
          >
            <FormLabel htmlFor="participants">
              Participants
              <Text color="red.500" display="inline">
                *
              </Text>{' '}
              <InfoTooltip text="You can enter wallet addresses, ENS, Lens, Unstoppable Domain, or email" />
            </FormLabel>
            <Box w="100%" maxW="100%">
              <ChipInput
                currentItems={participants}
                placeholder="Enter participants"
                onChange={onParticipantsChange}
                renderItem={p => {
                  if (p.account_address) {
                    return p.name || ellipsizeAddress(p.account_address!)
                  } else if (p.name && p.guest_email) {
                    return `${p.name} - ${p.guest_email}`
                  } else if (p.name) {
                    return `${p.name}`
                  } else {
                    return p.guest_email!
                  }
                }}
                inputProps={{
                  pr: 180,
                  isInvalid: !isParticipantsValid,
                  errorBorderColor: 'red.500',
                }}
                isReadOnly={!canEditMeetingDetails || isScheduling}
                button={
                  <Button
                    pos="absolute"
                    insetY={0}
                    right={2}
                    alignItems="center"
                    onClick={openGroupModal}
                    variant={'link'}
                    _hover={{
                      textDecoration: 'none',
                    }}
                  >
                    <AddIcon color="white" mr={3} />
                    <Text fontSize={{ base: 12, md: 16 }}>Add/Edit Groups</Text>
                  </Button>
                }
              />
            </Box>
            <FormHelperText minW={{ md: '600px' }}>
              {isParticipantsValid ? (
                <Text>
                  Separate participants by comma. You will be added
                  automatically, no need to insert yourself
                </Text>
              ) : (
                <Text color="red.500">Participants are required</Text>
              )}
            </FormHelperText>
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
                  color="primary.200"
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
                    {permission.info && <InfoTooltip text={permission.info} />}
                  </HStack>
                </Checkbox>
              ))}
              <FormControl>
                <FormLabel display="flex" alignItems="center" fontSize="medium">
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
          <VStack w="100%">
            <HStack width="fit-content" ml={'auto'}>
              {' '}
              <Text fontWeight="500">What is this?</Text>{' '}
              <InfoIcon
                onClick={() => setOpenWhatIsThis(true)}
                cursor="pointer"
                color={iconColor}
              />
            </HStack>
            <Button
              w="100%"
              py={3}
              h={'auto'}
              colorScheme="primary"
              onClick={handleSubmit}
              isDisabled={!canEditMeetingDetails || isScheduling}
            >
              Discover a time
            </Button>
          </VStack>
        </VStack>

        <HStack width="100%">
          <Divider />
          <Text
            w={'100%'}
            color={'neutral.400'}
            whiteSpace="nowrap"
            fontWeight="700"
          >
            Or enter a time manually
          </Text>
          <Divider />
        </HStack>
        <FormControl
          w={'100%'}
          isDisabled={!canEditMeetingDetails || isScheduling}
        >
          <FormLabel htmlFor="date">When</FormLabel>
          <HStack w={'100%'}>
            <SingleDatepicker
              date={pickedTime || new Date()}
              onDateChange={handleTimePick}
              blockPast={true}
              inputProps={{
                height: 'auto',
                py: 3,
                pl: 12,

                borderColor: 'neutral.400',
                _placeholder: {
                  color: 'neutral.400',
                },
              }}
              iconColor="neutral.400"
              iconSize={20}
            />
            <InputTimePicker
              value={format(pickedTime || new Date(), 'p')}
              onChange={handleTimePick}
              currentDate={pickedTime || new Date()}
              inputProps={{
                height: 'auto',
                py: 3,
                pl: 12,
                borderColor: 'neutral.400',
                _placeholder: {
                  color: 'neutral.400',
                },
              }}
              iconColor="neutral.400"
              iconSize={20}
            />
          </HStack>
        </FormControl>
        {(type?.fixed_link || !type?.custom_link) && (
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
                      color={'primary.200'}
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
        )}
        <FormControl
          w="100%"
          maxW="100%"
          isDisabled={!canEditMeetingDetails || isScheduling}
        >
          <FormLabel>Meeting reminders</FormLabel>
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
            className="hideBorder"
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
        <FormControl isDisabled={!canEditMeetingDetails || isScheduling}>
          <FormLabel htmlFor="info">Description (optional)</FormLabel>
          <RichTextEditor
            id="info"
            value={content}
            onValueChange={handleContentChange}
            placeholder="Any information you want to share prior to the meeting?"
            isDisabled={!canEditMeetingDetails || isScheduling}
          />
        </FormControl>
        <HStack w="100%" flexWrap="wrap">
          <Button
            w="100%"
            py={3}
            flex={1}
            flexBasis="50%"
            h={'auto'}
            variant="outline"
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
          {query.intent === Intents.UPDATE_MEETING && isScheduler && (
            <Button
              w="100%"
              py={3}
              h={'auto'}
              colorScheme="primary"
              onClick={handleCancel}
              flex={1}
              flexBasis="40%"
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
    </Box>
  )
}

export default ScheduleBase

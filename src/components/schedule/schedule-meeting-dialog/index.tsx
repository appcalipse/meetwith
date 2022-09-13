import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  Icon,
  Input,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Switch,
  Text,
  Textarea,
  useColorModeValue,
  useToast,
  VStack,
} from '@chakra-ui/react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { addDays, addHours, addMinutes, format, Interval } from 'date-fns'
import { zonedTimeToUtc } from 'date-fns-tz'
import NextLink from 'next/link'
import { useContext, useEffect, useState } from 'react'
import { FaInfo } from 'react-icons/fa'

import { DBSlot, SchedulingType, TimeSlotSource } from '@/types/Meeting'
import { logEvent } from '@/utils/analytics'
import {
  getExistingAccountsSimple,
  getSuggestedSlots,
} from '@/utils/api_helper'
import { scheduleMeeting } from '@/utils/calendar_manager'
import {
  GateConditionNotValidError,
  InvalidURL,
  MeetingCreationError,
  MeetingWithYourselfError,
  TimeNotAvailableError,
} from '@/utils/errors'
import { getAddressFromDomain } from '@/utils/rpc_helper_front'
import { isProAccount } from '@/utils/subscription_manager'
import { ParseTime } from '@/utils/time.helper'
import { getAddressDisplayForInput } from '@/utils/user_manager'
import { isValidEmail, isValidEVMAddress } from '@/utils/validations'

import { AccountContext } from '../../../providers/AccountProvider'
import { ChipInput } from '../../chip-input'
import { SingleDatepicker } from '../../input-date-picker'
import { InputTimePicker } from '../../input-time-picker'

export interface ScheduleModalProps {
  isOpen: boolean
  onOpen: () => void
  onClose: (meeting?: DBSlot) => void
}

export const ScheduleMeetingDialog: React.FC<ScheduleModalProps> = ({
  isOpen,
  onOpen,
  onClose,
}) => {
  const { currentAccount } = useContext(AccountContext)
  const [useHuddle, setHuddle] = useState(true)
  const toast = useToast()

  const [participants, setParticipants] = useState([] as string[])
  const [notAccounts, setNotAccounts] = useState([] as string[])
  const [selectedDate, setDate] = useState(new Date())
  const [selectedTime, setTime] = useState('')
  const [content, setContent] = useState('')
  const [inputError, setInputError] = useState(undefined as object | undefined)
  const [meetingUrl, setMeetingUrl] = useState('')
  const [duration, setDuration] = useState(30)
  const [isScheduling, setIsScheduling] = useState(false)
  const [searchingTimes, setSearchingTimes] = useState(false)
  const [groupTimes, setGroupTimes] = useState<Interval[] | undefined>(
    undefined
  )

  const clearInfo = () => {
    setParticipants([])
    setInputError(undefined)
    setDate(new Date())
    setTime(ParseTime(new Date()))
    setContent('')
    setMeetingUrl('')
    setDuration(30)
    setIsScheduling(false)
    setNotAccounts([])
    setSearchingTimes(false)
    setGroupTimes(undefined)
  }

  const onParticipantsChange = (_participants: string[]) => {
    if (!isProAccount(currentAccount!) && _participants.length > 1) {
      setInputError(
        <Text>
          <NextLink href="/dashboard/details" shallow passHref>
            <Link>Go PRO</Link>
          </NextLink>{' '}
          to be able to schedule meetings with more than one invitee
        </Text>
      )
      participants.length == 0 && setParticipants([_participants[0]])
      return
    }

    setParticipants(_participants)
  }

  const parseAccounts = async (
    participants: string[]
  ): Promise<{ valid: string[]; invalid: string[] }> => {
    const valid = []
    const invalid = []
    for (const participant of participants) {
      if (isValidEVMAddress(participant) || isValidEmail(participant)) {
        valid.push(participant)
      } else {
        const address = await getAddressFromDomain(participant)
        if (address) {
          valid.push(address)
        } else {
          invalid.push(participant)
        }
      }
    }
    return { valid, invalid }
  }

  useEffect(() => {
    clearInfo()
  }, [isOpen])

  const buildSelectedStart = () => {
    const _start = new Date(selectedDate)
    _start.setHours(Number(selectedTime.split(':')[0]))
    _start.setMinutes(Number(selectedTime.split(':')[1]))
    _start.setSeconds(0)

    return _start
  }

  const selectTime = (timeSlot: Interval) => {
    setTime(format(timeSlot.start, 'HH:mm'))
    setDate(timeSlot.start as Date)
  }

  const schedule = async () => {
    if (!useHuddle && !meetingUrl) {
      toast({
        title: 'Missing information',
        description: 'Please provide a meeting link for participants to join',
        status: 'error',
        duration: 5000,
        position: 'top',
        isClosable: true,
      })
      return
    } else if (
      participants.length === 0 ||
      (participants.length === 1 && participants[0] === currentAccount!.address)
    ) {
      toast({
        title: 'Missing participants',
        description:
          'Please add at least one participant for your meeting aside from yourself',
        status: 'error',
        duration: 5000,
        position: 'top',
        isClosable: true,
      })
      return
    } else if (!duration) {
      toast({
        title: 'Missing duration',
        description: 'Please select the length of your meeting',
        status: 'error',
        duration: 5000,
        position: 'top',
        isClosable: true,
      })
      return
    }

    const _participants = await parseAccounts(participants)

    const evmAddressParticipants = _participants.valid.filter(participant =>
      isValidEVMAddress(participant)
    )

    const guestEmails = _participants.valid.filter(participant =>
      isValidEmail(participant)
    )

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
      return
    }

    setIsScheduling(true)

    const _start = buildSelectedStart()

    const start = zonedTimeToUtc(
      _start,
      Intl.DateTimeFormat().resolvedOptions().timeZone
    )
    const end = addMinutes(new Date(start), duration)

    try {
      const meeting = await scheduleMeeting(
        SchedulingType.REGULAR,
        currentAccount!.address,
        [
          ...Array.from(
            new Set(evmAddressParticipants.map(p => p.toLowerCase()))
          ).filter(p => p !== currentAccount!.address.toLowerCase()),
        ],
        'no_type',
        start,
        end,
        currentAccount!.address,
        guestEmails.map(participant => {
          return { name: '', email: participant, scheduler: false }
        }),
        undefined,
        content,
        meetingUrl
      )
      logEvent('Scheduled a meeting', {
        fromDashboard: true,
        participantsSize: meeting.participants.length,
      })
      clearInfo()
      onClose({
        id: meeting.id,
        created_at: new Date(meeting.created_at),
        account_address: currentAccount!.address,
        meeting_info_file_path: meeting.meeting_info_file_path,
        start: new Date(meeting.start),
        end: new Date(meeting.end),
        source: TimeSlotSource.MWW,
        version: meeting.version,
      })
      return true
    } catch (e) {
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
      } else if (e instanceof InvalidURL) {
        toast({
          title: 'Failed to schedule meeting',
          description: 'Please provide a valid url/link for your meeting.',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else throw e
    }
    setIsScheduling(false)
    return false
  }

  const suggestTimes = async () => {
    setNotAccounts([])
    setSearchingTimes(true)

    const _participants = await parseAccounts(participants)

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
      return
    }

    const checkAccount = async () => {
      const existingAccounts = (
        await getExistingAccountsSimple(_participants.valid)
      ).map(account => account.address)
      setNotAccounts(
        _participants.valid.filter(
          participant => !existingAccounts.includes(participant)
        )
      )
    }

    const checkSuggestions = async () => {
      const startDate = new Date()
      startDate.setMinutes(0)
      startDate.setSeconds(0)
      startDate.setMilliseconds(0)
      const suggestions = await getSuggestedSlots(
        [currentAccount!.address, ..._participants.valid],
        startDate,
        addDays(startDate, 14),
        duration
      )
      setGroupTimes(suggestions.slice(0, 20))
    }

    await Promise.all([checkAccount(), checkSuggestions()])
    setSearchingTimes(false)
  }

  const bgColor = useColorModeValue('white', 'gray.600')
  const iconColor = useColorModeValue('gray.600', 'white')

  return (
    <Modal
      onClose={onClose}
      isOpen={isOpen}
      blockScrollOnMount={false}
      size="xl"
      isCentered
    >
      <ModalOverlay />
      <ModalContent maxW="45rem">
        <ModalHeader>
          <Heading size={'md'}>Schedule a new meeting</Heading>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <FormControl>
            <FormLabel htmlFor="participants">Participants</FormLabel>
            <ChipInput
              currentItems={participants}
              placeholder="Insert wallet addresses, ENS, Lens, Unstoppable Domain or email (for guests)"
              onChange={onParticipantsChange}
              renderItem={item => {
                return getAddressDisplayForInput(item)
              }}
            />
            <FormHelperText>
              {inputError
                ? inputError
                : 'Separate participants by comma. You will be added automatically, no need to insert yourself'}
            </FormHelperText>
          </FormControl>
          <Flex wrap="wrap" mt={4} direction={{ base: 'column', sm: 'row' }}>
            <FormControl flex={1}>
              <FormLabel htmlFor="date">Duration</FormLabel>
              <Select
                id="duration"
                placeholder="Duration"
                onChange={e => setDuration(Number(e.target.value))}
                value={duration}
              >
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
                <option value={90}>90 min</option>
              </Select>
            </FormControl>
            <FormControl
              flex={2}
              ml={{ base: 0, sm: 2 }}
              mt={{ base: 4, sm: 0 }}
            >
              <FormLabel htmlFor="date">When</FormLabel>
              <VStack>
                <HStack>
                  <SingleDatepicker
                    date={selectedDate}
                    onDateChange={setDate}
                    blockPast={true}
                  />
                  <InputTimePicker
                    value={selectedTime}
                    onChange={setTime}
                    currentDate={selectedDate}
                  />
                </HStack>
                <Button
                  onClick={suggestTimes}
                  isLoading={searchingTimes}
                  disabled={participants.length === 0}
                  size="xs"
                  w="100%"
                  colorScheme="orange"
                  variant="outline"
                >
                  Find the time that works best for participants
                </Button>
              </VStack>
            </FormControl>
          </Flex>
          {groupTimes && groupTimes.length === 0 && (
            <Alert status="info" mt={4}>
              <AlertIcon />
              <AlertDescription>
                There are no slots available available over the next 2 weeks.
              </AlertDescription>
            </Alert>
          )}
          {groupTimes && groupTimes.length > 0 && (
            <FormControl>
              <FormLabel htmlFor="date">Available slots</FormLabel>

              <Box overflowX="auto" whiteSpace="nowrap" my={3}>
                {groupTimes.map((timeSlot, index) => {
                  const isSelected =
                    (timeSlot.start as Date).getTime() ===
                    buildSelectedStart().getTime()
                  return (
                    <Button
                      mr={2}
                      key={index}
                      variant={isSelected ? 'solid' : 'outline'}
                      onClick={() => selectTime(timeSlot)}
                      colorScheme={isSelected ? 'orange' : 'gray'}
                    >
                      {format(timeSlot.start, 'PPp')}
                    </Button>
                  )
                })}
              </Box>
              {notAccounts.length > 0 && (
                <Alert status="info">
                  <AlertIcon />
                  <AlertDescription>
                    {notAccounts.length === 1
                      ? `${notAccounts[0]} don't have an account and was `
                      : `${notAccounts.join(
                          ', '
                        )} don't have accounts  and were `}
                    not considered for the availability check. They can still be
                    invited and sign in to attend to the meeting.
                  </AlertDescription>
                </Alert>
              )}
            </FormControl>
          )}
          <FormControl mt={4}>
            <FormLabel htmlFor="info">Information (optional)</FormLabel>
            <Textarea
              id="info"
              type="text"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Any information you want to share prior to the meeting?"
            />
          </FormControl>
          <FormControl mt={{ base: 0, md: 8 }}>
            <FormLabel>Meeting link</FormLabel>
            <FormControl display="flex" alignItems="center">
              <HStack alignItems="center">
                <Switch
                  display="flex"
                  id="video-conference"
                  colorScheme={'orange'}
                  defaultChecked={useHuddle}
                  isChecked={useHuddle}
                  onChange={() => setHuddle(value => !value)}
                />
                <FormLabel
                  htmlFor="video-conference"
                  mb="0"
                  alignItems="end"
                  sx={{ paddingLeft: '16px', fontWeight: 'normal' }}
                >
                  <Text>
                    Use{' '}
                    <Link
                      isExternal
                      href="https://huddle01.com/?utm_source=mww"
                    >
                      Huddle01
                    </Link>{' '}
                    for your meeting
                  </Text>
                </FormLabel>

                <Tooltip.Provider delayDuration={400}>
                  <Tooltip.Root>
                    <Tooltip.Trigger>
                      <Flex
                        w="16px"
                        h="16px"
                        borderRadius="50%"
                        bgColor={iconColor}
                        justifyContent="center"
                        alignItems="center"
                        ml={1}
                      >
                        <Icon w={1} color={bgColor} as={FaInfo} />
                      </Flex>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      <Text
                        fontSize="sm"
                        p={4}
                        maxW="200px"
                        bgColor={bgColor}
                        shadow="lg"
                      >
                        Huddle01 is a web3-powered video conferencing tailored
                        for DAOs and NFT communities.
                      </Text>
                      <Tooltip.Arrow />
                    </Tooltip.Content>
                  </Tooltip.Root>
                </Tooltip.Provider>
              </HStack>
            </FormControl>
            <Input
              mt="24px"
              display={useHuddle ? 'none' : 'inherit'}
              id="meeting-link"
              type="text"
              value={meetingUrl}
              onChange={e => setMeetingUrl(e.target.value)}
              placeholder="Please insert meeting link"
            />
          </FormControl>
        </ModalBody>
        <ModalFooter>
          <Button
            onClick={schedule}
            colorScheme={'orange'}
            isLoading={isScheduling}
          >
            Schedule
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

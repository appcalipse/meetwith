import { Link } from '@chakra-ui/next-js'
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
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Text,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { Select as ChakraSelect } from 'chakra-react-select'
import {
  addDays,
  addMinutes,
  differenceInMinutes,
  format,
  Interval,
  parse,
  startOfDay,
} from 'date-fns'
import { zonedTimeToUtc } from 'date-fns-tz'
import { ReactNode, useContext, useState } from 'react'

import { ChipInput } from '@/components/chip-input'
import { SingleDatepicker } from '@/components/input-date-picker'
import { InputTimePicker } from '@/components/input-time-picker'
import { AccountContext } from '@/providers/AccountProvider'
import { MeetingReminders } from '@/types/common'
import {
  DBSlot,
  MeetingChangeType,
  MeetingProvider,
  MeetingRepeat,
  SchedulingType,
  TimeSlotSource,
} from '@/types/Meeting'
import {
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '@/types/ParticipantInfo'
import { logEvent } from '@/utils/analytics'
import {
  getExistingAccountsSimple,
  getSuggestedSlots,
} from '@/utils/api_helper'
import {
  MeetingNotificationOptions,
  MeetingRepeatOptions,
} from '@/utils/constants/schedule'
import {
  customSelectComponents,
  MeetingRemindersComponent,
} from '@/utils/constants/select'
import {
  scheduleMeeting,
  selectDefaultProvider,
  updateMeeting,
} from '@/utils/calendar_manager'
import {
  GateConditionNotValidError,
  Huddle01ServiceUnavailable,
  InvalidURL,
  MeetingChangeConflictError,
  MeetingCreationError,
  MeetingWithYourselfError,
  TimeNotAvailableError,
} from '@/utils/errors'
import { getAddressFromDomain } from '@/utils/rpc_helper_front'
import { getSignature } from '@/utils/storage'
import { isProAccount } from '@/utils/subscription_manager'
import { parseTime } from '@/utils/time.helper'
import { ellipsizeAddress } from '@/utils/user_manager'
import { isValidEmail, isValidEVMAddress } from '@/utils/validations'

import RichTextEditor from '../profile/components/RichTextEditor'
import { CancelMeetingDialog } from './cancel-dialog'
import { MeetingDialogState } from './meeting.dialog.hook'

export interface BaseMeetingDialogProps extends MeetingDialogState {
  isDialogOpen: boolean
  onDialogOpen: () => void
  onDialogClose: (
    changeType: MeetingChangeType,
    meeting?: DBSlot,
    removedIds?: string[]
  ) => void
}

export const BaseMeetingDialog: React.FC<BaseMeetingDialogProps> = ({
  isDialogOpen,
  onDialogClose,
  timezone,
  meeting,
  decryptedMeeting,
}) => {
  const { currentAccount } = useContext(AccountContext)

  const toast = useToast()

  const { isOpen, onOpen, onClose } = useDisclosure()

  const [participants, setParticipants] = useState(
    decryptedMeeting?.participants.filter(
      p => p.account_address !== currentAccount?.address
    ) || []
  )

  const [selectedDate, setDate] = useState(
    decryptedMeeting?.start || new Date()
  )

  const [notAccounts, setNotAccounts] = useState([] as ParticipantInfo[])
  const [selectedTime, setTime] = useState(
    decryptedMeeting
      ? parseTime(decryptedMeeting?.start, false)
      : parseTime(new Date(), true)
  )
  const [content, setContent] = useState(decryptedMeeting?.content || '')
  const [title, setTitle] = useState(decryptedMeeting?.title || '')
  const [inputError, setInputError] = useState(
    undefined as ReactNode | undefined
  )
  const [meetingUrl, setMeetingUrl] = useState(
    decryptedMeeting?.meeting_url || ''
  )
  const [duration, setDuration] = useState(
    meeting && meeting.id ? differenceInMinutes(meeting.end, meeting.start) : 30
  )

  const [timeError, setTimeError] = useState(false)
  const [isScheduling, setIsScheduling] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [searchingTimes, setSearchingTimes] = useState(false)
  const [groupTimes, setGroupTimes] = useState<Interval[] | undefined>(
    undefined
  )
  const [meetingNotification, setMeetingNotification] = useState<
    Array<{
      value: MeetingReminders
      label?: string
    }>
  >(
    MeetingNotificationOptions.filter(val =>
      decryptedMeeting?.reminders?.includes(val.value)
    )
  )
  const [meetingRepeat, setMeetingRepeat] = useState(
    MeetingRepeatOptions?.find(
      val => decryptedMeeting?.recurrence === val.value
    ) || {
      value: MeetingRepeat['NO_REPEAT'],
      label: 'Does not repeat',
    }
  )
  const meetingId = decryptedMeeting?.id
  const defaultProvider = selectDefaultProvider(
    currentAccount?.preferences?.meetingProviders
  )

  const [meetingProvider, setMeetingProvider] = useState<MeetingProvider>(
    decryptedMeeting?.provider || defaultProvider
  )
  if (meetingId) {
    if (window.location.search.indexOf(meetingId) === -1) {
      // not using router API to avoid re-rendering components
      const searchParams = new URLSearchParams(window.location.search)
      searchParams.set('slotId', meetingId)
      const newRelativePathQuery =
        window.location.pathname + '?' + searchParams.toString()
      history.pushState(null, '', newRelativePathQuery)
    }
  }

  const onParticipantsChange = (_participants: ParticipantInfo[]) => {
    if (!isProAccount(currentAccount!) && _participants.length > 1) {
      setInputError(
        <Text>
          <Link href="/dashboard/details#subscriptions">Go PRO</Link> to be able
          to schedule meetings with more than one invitee
        </Text>
      )
      participants.length == 0 && setParticipants([_participants[0]])
      return
    }
    setParticipants(_participants)
  }

  const parseAccounts = async (
    participants: ParticipantInfo[]
  ): Promise<{ valid: ParticipantInfo[]; invalid: string[] }> => {
    const valid: ParticipantInfo[] = []
    const invalid: string[] = []
    for (const participant of participants) {
      if (
        isValidEVMAddress(participant.account_address || '') ||
        isValidEmail(participant.guest_email || '')
      ) {
        valid.push(participant)
      } else {
        const address = await getAddressFromDomain(participant.name || '')
        if (address) {
          valid.push({
            account_address: address,
            type: ParticipantType.Invitee,
            slot_id: '',
            meeting_id: '',
            status: ParticipationStatus.Pending,
          })
        } else {
          invalid.push(participant.name!)
        }
      }
    }
    return { valid, invalid }
  }

  const buildSelectedStart = () => {
    const _start = new Date(selectedDate)

    const dateForMinutes = parse(selectedTime, 'p', new Date())
    _start.setHours(dateForMinutes.getHours())
    _start.setMinutes(dateForMinutes.getMinutes())
    _start.setSeconds(0)

    return _start
  }

  const selectTime = (timeSlot: Interval) => {
    setTime(format(timeSlot.start, 'p'))
    setDate(timeSlot.start as Date)
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
      setSearchingTimes(false)
      return
    }

    const checkAccount = async () => {
      const existingAccounts = (
        await getExistingAccountsSimple(
          _participants.valid
            .filter(p => !!p.account_address)
            .map(p => p.account_address!)
        )
      ).map(account => account.address)
      setNotAccounts(
        _participants.valid.filter(
          participant =>
            !existingAccounts.includes(participant.account_address || '')
        )
      )
    }

    const checkSuggestions = async () => {
      const startDate = new Date()
      startDate.setMinutes(0)
      startDate.setSeconds(0)
      startDate.setMilliseconds(0)
      const suggestions = await getSuggestedSlots(
        [
          currentAccount!.address,
          ..._participants.valid
            .filter(p => p.account_address)
            .map(p => p.account_address!),
        ],
        startOfDay(startDate),
        addDays(startDate, 14),
        duration
      )
      setGroupTimes(suggestions.slice(0, 20))
    }

    try {
      await Promise.all([checkAccount(), checkSuggestions()])
    } catch (e) {}
    setSearchingTimes(false)
  }

  const scheduleOrUpdate = async (ignoreAvailabilities: boolean) => {
    if (meetingProvider === MeetingProvider.CUSTOM && !meetingUrl) {
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
      (participants.length === 1 &&
        (participants[0]?.account_address?.toLowerCase() ===
          currentAccount!.address.toLowerCase() ||
          participants[0]?.name === (currentAccount!.preferences?.name || '')))
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

    setIsScheduling(true)

    const currentParticipant =
      decryptedMeeting?.participants.filter(
        p => p.account_address === currentAccount?.address
      ) || []

    const _participants = await parseAccounts([
      ...participants,
      ...currentParticipant,
    ])

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

    const _start = buildSelectedStart()

    const start = zonedTimeToUtc(_start, timezone)
    const end = addMinutes(new Date(start), duration)

    try {
      let meetingResult
      if (!meeting?.id) {
        //is creating
        _participants.valid.push({
          account_address: currentAccount!.address,
          type: ParticipantType.Scheduler,
          status: ParticipationStatus.Accepted,
          slot_id: '',
          meeting_id: '',
        })
        meetingResult = await scheduleMeeting(
          ignoreAvailabilities,
          SchedulingType.REGULAR,
          'no_type',
          start,
          end,
          _participants.valid,
          MeetingProvider.HUDDLE,
          currentAccount,
          content,
          meetingUrl,
          undefined,
          title
        )
        logEvent('Scheduled a meeting', {
          fromDashboard: true,
          participantsSize: _participants.valid.length,
        })
        setTimeError(false)
      } else {
        meetingResult = await updateMeeting(
          true,
          currentAccount!.address,
          'no_type',
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
          meetingRepeat.value
        )
        logEvent('Updated a meeting', {
          fromDashboard: true,
          participantsSize: _participants.valid.length,
        })
        setTimeError(false)
      }

      onDialogClose(
        !meeting?.id ? MeetingChangeType.CREATE : MeetingChangeType.UPDATE,
        {
          id: meetingResult.id,
          created_at: new Date(meetingResult.created_at),
          account_address: currentAccount!.address,
          start: new Date(meetingResult.start),
          end: new Date(meetingResult.end),
          source: TimeSlotSource.MWW,
          meeting_info_encrypted: meetingResult?.meeting_info_encrypted,
          version: meetingResult.version,
          recurrence: meetingResult.recurrence || MeetingRepeat.NO_REPEAT,
        }
      )
      return true
    } catch (e) {
      setTimeError(false)
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
        setTimeError(true)
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
      } else throw e
    }
    setIsScheduling(false)
    return false
  }

  const cancelMeeting = () => {
    onOpen()
  }
  return (
    <Modal
      onClose={() => onDialogClose(MeetingChangeType.CREATE)}
      isOpen={isDialogOpen}
      blockScrollOnMount={false}
      size="xl"
      isCentered
    >
      <ModalOverlay />
      <ModalContent maxW="45rem">
        <ModalHeader>
          <Heading size={'md'}>Update meeting</Heading>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <FormControl>
            <Flex
              alignItems="center"
              marginBottom="8px"
              marginRight="12px"
              gap="6px"
            >
              <FormLabel
                htmlFor="title"
                alignItems="center"
                height="fit-content"
                margin={0}
              >
                Title
              </FormLabel>
            </Flex>
            <Input
              id="title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              type="text"
              placeholder="Give a title for your meeting"
            />
          </FormControl>
          <FormControl mt={4}>
            <FormLabel htmlFor="participants">Participants</FormLabel>
            <ChipInput
              currentItems={participants}
              placeholder="Insert wallet addresses, ENS, Lens, Unstoppable Domain or email (for guests)"
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
            />
            <FormHelperText>
              {inputError ? (
                inputError
              ) : (
                <Text>
                  Separate participants by comma. You will be added
                  automatically, no need to insert yourself
                </Text>
              )}
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
                    onChange={val => setTime(format(val, 'p'))}
                    currentDate={selectedDate}
                  />
                </HStack>
                <Button
                  onClick={suggestTimes}
                  isLoading={searchingTimes}
                  isDisabled={participants.length === 0}
                  size="xs"
                  w="100%"
                  colorScheme="primary"
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
                      colorScheme={isSelected ? 'primary' : 'gray'}
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
          <FormControl w="100%" maxW="100%">
            <FormLabel>Meeting reminders (optional)</FormLabel>
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
                  return
                }
                setMeetingNotification(meetingNotification)
              }}
              className="hideBorder"
              placeholder="Select Notification Alerts"
              isMulti
              tagVariant={'solid'}
              options={MeetingNotificationOptions}
              components={MeetingRemindersComponent}
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
          <FormControl w="100%" maxW="100%">
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
              className="noLeftBorder timezone-select"
              options={MeetingRepeatOptions}
              components={customSelectComponents}
              chakraStyles={{
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
          <FormControl mt={4}>
            <FormLabel htmlFor="info">Information (optional)</FormLabel>
            <RichTextEditor
              id="info"
              value={content}
              onValueChange={setContent}
              placeholder="Any information you want to share prior to the meeting?"
            />
          </FormControl>
        </ModalBody>
        <ModalFooter>
          {meeting?.id && (
            <Button
              colorScheme={'red'}
              onClick={cancelMeeting}
              variant="outline"
              mr={4}
              isDisabled={isScheduling}
            >
              Cancel meeting
            </Button>
          )}
          <Button
            onClick={() => scheduleOrUpdate(false)}
            colorScheme="primary"
            isLoading={isScheduling}
            isDisabled={isCancelling}
          >
            {meeting?.id ? 'Update' : 'Schedule'}
          </Button>
        </ModalFooter>
        <Box
          display={timeError ? 'flex' : 'none'}
          flexDir="column"
          justifyContent="center"
          alignItems="center"
          position="absolute"
          w="100%"
          h="100%"
          bgColor="rgba(0,0,0,0.5)"
          backdropFilter={`blur(12px)`}
        >
          <Alert status="error" mb={8}>
            <AlertIcon />
            <AlertDescription>
              Some of the invitees are not available at the selected time. Do
              you want to schedule it anyway?
            </AlertDescription>
          </Alert>
          <HStack>
            <Button
              onClick={() => {
                setTimeError(false)
              }}
              variant="ghost"
              mr={4}
              isDisabled={isScheduling}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                scheduleOrUpdate(true)
              }}
              colorScheme="primary"
              isLoading={isScheduling}
              isDisabled={isCancelling}
            >
              Schedule
            </Button>
          </HStack>
        </Box>
      </ModalContent>
      <CancelMeetingDialog
        isOpen={isOpen}
        onClose={onClose}
        decriptedMeeting={decryptedMeeting}
        currentAccount={currentAccount}
        onCancelChange={setIsCancelling}
        afterCancel={removed =>
          onDialogClose(MeetingChangeType.DELETE, undefined, removed)
        }
      />
    </Modal>
  )
}

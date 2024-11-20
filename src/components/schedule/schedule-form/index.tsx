import { Radio, RadioGroup } from '@chakra-ui/react'
import {
  Button,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Icon,
  Input,
  Switch,
  Text,
  useColorModeValue,
  useToast,
  VStack,
} from '@chakra-ui/react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { chakraComponents, Props, Select } from 'chakra-react-select'
import { useContext, useEffect, useState } from 'react'
import { FaChevronDown, FaInfo } from 'react-icons/fa'

import { ChipInput } from '@/components/chip-input'
import RichTextEditor from '@/components/profile/components/RichTextEditor'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'
import { AccountPreferences } from '@/types/Account'
import { MeetingReminders } from '@/types/common'
import { ParticipantInfo } from '@/types/ParticipantInfo'
import {
  MeetingNotificationOptions,
  MeetingRepeatOptions,
} from '@/utils/constants/schedule'
import { customSelectComponents } from '@/utils/constants/select'
import { renderProviderName } from '@/utils/generic_utils'
import { ellipsizeAddress } from '@/utils/user_manager'

import { AccountContext } from '../../../providers/AccountProvider'
import {
  MeetingProvider,
  MeetingRepeat,
  SchedulingType,
} from '../../../types/Meeting'
import { isEmptyString, isValidEmail } from '../../../utils/validations'

const components: Props['components'] = {
  ClearIndicator: () => null,
  DropdownIndicator: props => (
    <chakraComponents.DropdownIndicator className="noBg" {...props}>
      <Icon as={FaChevronDown} />
    </chakraComponents.DropdownIndicator>
  ),
}
interface ScheduleFormProps {
  pickedTime: Date
  isSchedulingExternal: boolean
  willStartScheduling: (isScheduling: boolean) => void
  isGateValid: boolean
  preferences?: AccountPreferences
  onConfirm: (
    scheduleType: SchedulingType,
    startTime: Date,
    guestEmail?: string,
    name?: string,
    content?: string,
    meetingUrl?: string,
    emailToSendReminders?: string,
    title?: string,
    participants?: Array<ParticipantInfo>,
    meetingProvider?: MeetingProvider,
    meetingReminders?: Array<MeetingReminders>
  ) => Promise<boolean>
  notificationsSubs?: number
  meetingProviders?: Array<MeetingProvider>
}

export const ScheduleForm: React.FC<ScheduleFormProps> = ({
  pickedTime,
  isSchedulingExternal,
  willStartScheduling,
  isGateValid,
  onConfirm,
  notificationsSubs,
  preferences,
}) => {
  const { currentAccount, logged } = useContext(AccountContext)
  const [participants, setParticipants] = useState<Array<ParticipantInfo>>([])
  const toast = useToast()
  const [meetingProvider, setMeetingProvider] = useState<MeetingProvider>(
    preferences?.meetingProviders?.includes(MeetingProvider.HUDDLE)
      ? MeetingProvider.HUDDLE
      : MeetingProvider.CUSTOM
  )
  const [meetingNotification, setMeetingNotification] = useState<
    Array<{
      value: MeetingReminders
      label?: string
    }>
  >([])
  const [meetingRepeat, setMeetingRepeat] = useState({
    value: MeetingRepeat['NO_REPEAT'],
    label: 'No repeat',
  })
  const [content, setContent] = useState('')
  const [name, setName] = useState(currentAccount?.preferences?.name || '')
  const [title, setTitle] = useState('')
  const [doSendEmailReminders, setSendEmailReminders] = useState(false)
  const [scheduleType, setScheduleType] = useState(
    SchedulingType.REGULAR as SchedulingType
  )
  const [addGuest, setAddGuest] = useState(false)
  const [guestEmail, setGuestEmail] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [meetingUrl, setMeetingUrl] = useState('')
  const [isFirstGuestEmailValid, setIsFirstGuestEmailValid] = useState(true)
  const [isFirstUserEmailValid, setIsFirstUserEmailValid] = useState(true)
  const meetingProviders = (preferences?.meetingProviders || []).concat(
    MeetingProvider.CUSTOM
  )
  const handleScheduleWithWallet = async () => {
    if (!logged && scheduleType === SchedulingType.REGULAR) {
      await handleScheduleType(SchedulingType.REGULAR)
    }
    if (!logged) return
    await handleConfirm()
  }
  useEffect(() => {
    if (logged) {
      setScheduleType(SchedulingType.REGULAR)
    } else {
      setScheduleType(SchedulingType.GUEST)
    }
  }, [logged])

  const handleConfirm = async () => {
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
    }
    if (isNameEmpty) {
      toast({
        title: 'Missing information',
        description: 'Please fill in your name (or any identifier)',
        status: 'error',
        duration: 5000,
        position: 'top',
        isClosable: true,
      })
      return
    }
    if (scheduleType === SchedulingType.GUEST && !isGuestEmailValid()) {
      toast({
        title: 'Missing information',
        description:
          'Please provide a valid email to be able to schedule a meeting as guest',
        status: 'error',
        duration: 5000,
        position: 'top',
        isClosable: true,
      })
      return
    }
    if (doSendEmailReminders && !isValidEmail(userEmail)) {
      toast({
        title: 'Missing information',
        description:
          'Please provide a valid email address to send reminders to',
        status: 'error',
        duration: 5000,
        position: 'top',
        isClosable: true,
      })
      return
    }
    try {
      const success = await onConfirm(
        scheduleType!,
        pickedTime,
        guestEmail,
        name,
        content,
        meetingUrl,
        doSendEmailReminders ? userEmail : undefined,
        title,
        participants,
        meetingProvider,
        meetingNotification.map(n => n.value as MeetingReminders)
      )

      willStartScheduling(!success)
    } catch (e) {
      willStartScheduling(true)
    }
  }

  const { openConnection } = useContext(OnboardingModalContext)

  const handleScheduleType = async (type: SchedulingType) => {
    setScheduleType(type)
    if (type === SchedulingType.REGULAR && !logged) {
      openConnection()
    }
  }

  const isGuestEmailValid = () => isValidEmail(guestEmail)
  const isUserEmailValid = () => isValidEmail(userEmail)
  const isNameEmpty = isEmptyString(name)

  const bgColor = useColorModeValue('white', 'gray.600')
  const iconColor = useColorModeValue('gray.600', 'white')

  return (
    <Flex
      direction="column"
      gap={4}
      paddingTop={3}
      w="100%"
      maxW={{
        base: '100%',
        md: '550px',
      }}
    >
      <FormControl isInvalid={isNameEmpty}>
        <FormLabel>Name</FormLabel>
        <Input
          autoFocus
          type="text"
          isDisabled={isSchedulingExternal}
          placeholder="Your name or an identifier"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={event => event.key === 'Enter' && handleConfirm()}
        />
      </FormControl>

      {(scheduleType === SchedulingType.GUEST || doSendEmailReminders) && (
        <FormControl
          isInvalid={
            doSendEmailReminders
              ? !isFirstUserEmailValid && !isUserEmailValid()
              : !isFirstGuestEmailValid && !isGuestEmailValid()
          }
        >
          <FormLabel>Email</FormLabel>
          <Input
            type="email"
            placeholder="Insert your email"
            isDisabled={isSchedulingExternal}
            value={doSendEmailReminders ? userEmail : guestEmail}
            onKeyDown={event => event.key === 'Enter' && handleConfirm()}
            onChange={e => {
              if (doSendEmailReminders) {
                setUserEmail(e.target.value)
                setIsFirstUserEmailValid(false)
              } else {
                setGuestEmail(e.target.value)
                setIsFirstGuestEmailValid(false)
              }
            }}
          />
        </FormControl>
      )}
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
            Meeting title
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
                  Give a title for your meeting (optional)
                </Text>
                <Tooltip.Arrow />
              </Tooltip.Content>
            </Tooltip.Root>
          </Tooltip.Provider>
        </Flex>
        <Input
          id="title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          type="text"
          placeholder="Give a title for your meeting"
        />
      </FormControl>
      <FormControl w="100%" maxW="100%">
        <FormLabel>Meeting reminders</FormLabel>
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
              return
            }
            setMeetingNotification(meetingNotification)
          }}
          className="hideBorder"
          placeholder="Select Notification Alerts"
          isMulti
          tagVariant={'solid'}
          options={MeetingNotificationOptions}
          components={components}
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
        <Select
          value={meetingRepeat}
          colorScheme="primary"
          onChange={newValue => setMeetingRepeat(newValue)}
          className="noLeftBorder timezone-select"
          options={MeetingRepeatOptions}
          components={customSelectComponents}
        />
      </FormControl>
      <FormControl textAlign="left" w="100%" maxW="100%">
        <FormLabel>What is this meeting about? </FormLabel>
        <RichTextEditor
          isDisabled={isSchedulingExternal}
          placeholder="Any information you want to share prior to the meeting?"
          value={content}
          onValueChange={setContent}
        />
      </FormControl>
      {scheduleType !== undefined && (
        <VStack alignItems="start">
          <Text fontSize="18px" fontWeight={500}>
            Location
          </Text>
          <RadioGroup
            onChange={(val: MeetingProvider) => setMeetingProvider(val)}
            value={meetingProvider}
            w={'100%'}
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
                  <Text fontWeight="600" color={'primary.200'} cursor="pointer">
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
              isDisabled={isSchedulingExternal}
              my={4}
              value={meetingUrl}
              onChange={e => setMeetingUrl(e.target.value)}
            />
          )}
          {scheduleType === SchedulingType.REGULAR &&
            (!notificationsSubs || notificationsSubs === 0) && (
              <>
                <HStack alignItems="center">
                  <Switch
                    display="flex"
                    colorScheme="primary"
                    size="md"
                    mr={4}
                    isDisabled={isSchedulingExternal}
                    defaultChecked={doSendEmailReminders}
                    onChange={e => {
                      setSendEmailReminders(e.target.checked)
                      isUserEmailValid() ? setIsFirstUserEmailValid(true) : null
                    }}
                  />
                  <FormLabel mb="0">
                    <Text>Send me email reminders</Text>
                  </FormLabel>
                </HStack>
                {doSendEmailReminders === true && (
                  <FormControl
                    isInvalid={!isFirstUserEmailValid && !isUserEmailValid()}
                  >
                    <Input
                      type="email"
                      placeholder="Insert your email"
                      isDisabled={isSchedulingExternal}
                      value={userEmail}
                      onKeyDown={event =>
                        event.key === 'Enter' && handleConfirm()
                      }
                      onChange={e => {
                        setUserEmail(e.target.value)
                        setIsFirstUserEmailValid(false)
                      }}
                    />
                  </FormControl>
                )}
              </>
            )}
        </VStack>
      )}
      {!addGuest ? (
        <Button
          colorScheme="orangeButton"
          variant="outline"
          onClick={() => setAddGuest(true)}
        >
          Add other participants
        </Button>
      ) : (
        <ChipInput
          currentItems={participants}
          placeholder="Enter participants"
          onChange={setParticipants}
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
      )}
      <Button
        width="full"
        isDisabled={
          (scheduleType === SchedulingType.GUEST && !isGuestEmailValid()) ||
          (logged &&
            ((doSendEmailReminders && !isUserEmailValid()) || isNameEmpty)) ||
          isSchedulingExternal ||
          isGateValid === false
        }
        isLoading={isSchedulingExternal}
        onClick={
          scheduleType === SchedulingType.REGULAR
            ? handleScheduleWithWallet
            : handleConfirm
        }
        colorScheme="primary"
        // mt={6}
      >
        {isSchedulingExternal
          ? 'Scheduling...'
          : logged || scheduleType === SchedulingType.GUEST
          ? 'Schedule'
          : 'Connect wallet to schedule'}
      </Button>
    </Flex>
  )
}

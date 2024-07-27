import { Link } from '@chakra-ui/react'
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
import { useContext, useEffect, useMemo, useState } from 'react'
import { FaInfo } from 'react-icons/fa'

import RichTextEditor from '@/components/profile/components/RichTextEditor'
import { ToggleSelector } from '@/components/toggle-selector'
import user from '@/pages/api/secure/group/user'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'

import { AccountContext } from '../../../providers/AccountProvider'
import { SchedulingType } from '../../../types/Meeting'
import { isEmptyString, isValidEmail } from '../../../utils/validations'

interface ScheduleFormProps {
  pickedTime: Date
  isSchedulingExternal: boolean
  willStartScheduling: (isScheduling: boolean) => void
  isGateValid: boolean
  onConfirm: (
    scheduleType: SchedulingType,
    startTime: Date,
    guestEmail?: string,
    name?: string,
    content?: string,
    meetingUrl?: string,
    emailToSendReminders?: string,
    title?: string
  ) => Promise<boolean>
  notificationsSubs?: number
}

export const ScheduleForm: React.FC<ScheduleFormProps> = ({
  pickedTime,
  isSchedulingExternal,
  willStartScheduling,
  isGateValid,
  onConfirm,
  notificationsSubs,
}) => {
  const { currentAccount, logged } = useContext(AccountContext)

  const toast = useToast()

  const [content, setContent] = useState('')
  const [name, setName] = useState(currentAccount?.preferences?.name || '')
  const [title, setTitle] = useState('')
  const [isScheduling, setIsScheduling] = useState(false)
  const [customMeeting, setCustomMeeting] = useState(false)
  const [doSendEmailReminders, setSendEmailReminders] = useState(false)
  const [scheduleType, setScheduleType] = useState(
    SchedulingType.REGULAR as SchedulingType
  )
  const [guestEmail, setGuestEmail] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [meetingUrl, setMeetingUrl] = useState('')
  const [isFirstGuestEmailValid, setIsFirstGuestEmailValid] = useState(true)
  const [isFirstUserEmailValid, setIsFirstUserEmailValid] = useState(true)

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
    if (customMeeting && !meetingUrl) {
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
    setIsScheduling(true)
    const success = await onConfirm(
      scheduleType!,
      pickedTime,
      guestEmail,
      name,
      content,
      meetingUrl,
      doSendEmailReminders ? userEmail : undefined,
      title
    )
    setIsScheduling(false)
    willStartScheduling(!success)
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
    <Flex direction="column" gap={4} paddingTop={3}>
      <FormControl isInvalid={isNameEmpty}>
        <FormLabel>Name</FormLabel>
        <Input
          autoFocus
          type="text"
          isDisabled={isScheduling}
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
            isDisabled={isScheduling}
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
      <FormControl
        textAlign="left"
        w={{
          base: '100%',
          lg: '600px',
        }}
      >
        <FormLabel>What is this meeting about? </FormLabel>
        <RichTextEditor
          isDisabled={isScheduling}
          placeholder="Any information you want to share prior to the meeting?"
          value={content}
          onValueChange={setContent}
        />
      </FormControl>
      <VStack alignItems="start">
        <HStack alignItems="center">
          <Switch
            display="flex"
            colorScheme="primary"
            size="md"
            mr={4}
            isDisabled={isScheduling}
            defaultChecked={!customMeeting}
            onChange={e => setCustomMeeting(!e.target.checked)}
          />
          <FormLabel mb="0">
            <Text>
              Use{' '}
              <Link href="https://huddle01.com/?utm_source=mww" isExternal>
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
                  Huddle01 is a web3-powered video conferencing tailored for
                  DAOs and NFT communities.
                </Text>
                <Tooltip.Arrow />
              </Tooltip.Content>
            </Tooltip.Root>
          </Tooltip.Provider>
        </HStack>
        {customMeeting && (
          <Input
            type="text"
            placeholder="insert a custom meeting url"
            isDisabled={isScheduling}
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
                  isDisabled={isScheduling}
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
            </>
          )}
      </VStack>
      <Button
        width="full"
        isDisabled={
          (scheduleType === SchedulingType.GUEST && !isGuestEmailValid()) ||
          (logged &&
            ((doSendEmailReminders && !isUserEmailValid()) || isNameEmpty)) ||
          isScheduling ||
          isSchedulingExternal ||
          isGateValid === false
        }
        isLoading={isScheduling || isSchedulingExternal}
        onClick={
          scheduleType === SchedulingType.REGULAR
            ? handleScheduleWithWallet
            : handleConfirm
        }
        colorScheme="primary"
        mt={6}
      >
        {isScheduling
          ? 'Scheduling...'
          : logged || scheduleType === SchedulingType.GUEST
          ? 'Schedule'
          : 'Connect wallet to schedule'}
      </Button>
    </Flex>
  )
}

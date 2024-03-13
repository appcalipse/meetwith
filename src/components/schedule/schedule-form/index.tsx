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
  Textarea,
  useColorModeValue,
  useToast,
  VStack,
} from '@chakra-ui/react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { useModal } from 'connectkit'
import { useContext, useMemo, useState } from 'react'
import { FaInfo } from 'react-icons/fa'

import RichTextEditor from '@/components/profile/components/RichTextEditor'
import { ToggleSelector } from '@/components/toggle-selector'

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

  const { setOpen } = useModal()

  const handleScheduleType = async (type: SchedulingType) => {
    setScheduleType(type)
    if (type === SchedulingType.REGULAR && !logged) {
      setOpen(true)
    }
  }

  const isGuestEmailValid = () => isValidEmail(guestEmail)
  const isUserEmailValid = () => isValidEmail(userEmail)
  const isNameEmpty = isEmptyString(name)

  const bgColor = useColorModeValue('white', 'gray.600')
  const iconColor = useColorModeValue('gray.600', 'white')

  useMemo(() => {
    if (logged) setScheduleType(SchedulingType.REGULAR)
  }, [logged])

  return (
    <Flex direction="column" gap={4} paddingTop={6}>
      <ToggleSelector
        value={scheduleType}
        onChange={v => {
          v !== undefined && setScheduleType(v)
        }}
        options={[
          { label: 'Schedule with wallet', value: SchedulingType.REGULAR },
          { label: 'Schedule as guest', value: SchedulingType.GUEST },
        ]}
      />

      {scheduleType === SchedulingType.GUEST && (
        <>
          <FormControl isInvalid={isNameEmpty}>
            <FormLabel>Your name</FormLabel>
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

          <FormControl
            isInvalid={!isFirstGuestEmailValid && !isGuestEmailValid()}
          >
            <FormLabel>Your Email</FormLabel>
            <Input
              type="email"
              placeholder="Insert your email"
              isDisabled={isScheduling}
              value={guestEmail}
              onKeyDown={event => event.key === 'Enter' && handleConfirm()}
              onChange={e => {
                setGuestEmail(e.target.value)
                setIsFirstGuestEmailValid(false)
              }}
            />
          </FormControl>
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
                Meeting title (optional)
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
                      Give a title for your meeting
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
          <FormControl textAlign="left">
            <FormLabel>What is this meeting about? (optional)</FormLabel>
            <RichTextEditor
              isDisabled={isScheduling}
              placeholder="Any information you want to share prior to the meeting?"
              value={content}
              onValueChange={setContent}
            />
          </FormControl>
        </>
      )}

      {scheduleType === SchedulingType.REGULAR && (
        <>
          <FormControl isInvalid={isNameEmpty}>
            <FormLabel>Your name</FormLabel>
            <Input
              autoFocus
              type="text"
              placeholder="Your name or an identifier"
              isDisabled={isScheduling}
              value={name}
              onKeyDown={event => event.key === 'Enter' && handleConfirm()}
              onChange={e => setName(e.target.value)}
            />
          </FormControl>
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
                Meeting title (optional)
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
          <FormControl textAlign="left">
            <FormLabel>What is this meeting about? (optional)</FormLabel>
            <RichTextEditor
              isDisabled={isScheduling}
              placeholder="Any information you want to share prior to the meeting?"
              value={content}
              onValueChange={setContent}
            />
          </FormControl>
        </>
      )}

      {scheduleType !== undefined && (
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
                {doSendEmailReminders === true && (
                  <FormControl
                    isInvalid={!isFirstUserEmailValid && !isUserEmailValid()}
                  >
                    <Input
                      type="email"
                      placeholder="Insert your email"
                      isDisabled={isScheduling}
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

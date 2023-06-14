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
import { useContext, useMemo, useState } from 'react'
import { FaInfo } from 'react-icons/fa'

import { ToggleSelector } from '@/components/toggle-selector'

import { AccountContext } from '../../../providers/AccountProvider'
import { useLogin } from '../../../session/login'
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
    meetingUrl?: string
  ) => Promise<boolean>
}

export const ScheduleForm: React.FC<ScheduleFormProps> = ({
  pickedTime,
  isSchedulingExternal,
  willStartScheduling,
  isGateValid,
  onConfirm,
}) => {
  const { handleLogin } = useLogin()
  const { currentAccount, logged } = useContext(AccountContext)

  const toast = useToast()

  const [content, setContent] = useState('')
  const [name, setName] = useState(currentAccount?.preferences?.name || '')
  const [isScheduling, setIsScheduling] = useState(false)
  const [customMeeting, setCustomMeeting] = useState(false)
  const [doSendEmailReminders, setSendEmailReminders] = useState(false)
  const [scheduleType, setScheduleType] = useState(
    undefined as SchedulingType | undefined
  )
  const [guestEmail, setGuestEmail] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [meetingUrl, setMeetingUrl] = useState('')

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
    if (!name) {
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
    setIsScheduling(true)
    const success = await onConfirm(
      scheduleType!,
      pickedTime,
      guestEmail,
      name,
      content,
      meetingUrl
    )
    setIsScheduling(false)
    willStartScheduling(!success)
  }

  const handleScheduleType = async (type: SchedulingType) => {
    setScheduleType(type)
    if (type === SchedulingType.REGULAR && !logged) {
      await handleLogin()
    }
  }

  const isGuestEmailValid = isValidEmail(guestEmail)
  const isUserEmailValid = isValidEmail(userEmail)
  const isNameEmpty = isEmptyString(name)

  const bgColor = useColorModeValue('white', 'gray.600')
  const iconColor = useColorModeValue('gray.600', 'white')

  useMemo(() => {
    if (logged) setScheduleType(SchedulingType.REGULAR)
    else setScheduleType(SchedulingType.GUEST)
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
          <FormControl>
            <FormLabel>Your name (optional)</FormLabel>
            <Input
              autoFocus
              type="text"
              disabled={isScheduling}
              placeholder="Your name or an identifier"
              value={name}
              onChange={e => setName(e.target.value)}
              mb={4}
            />
          </FormControl>

          <FormControl isInvalid={!isGuestEmailValid}>
            <FormLabel>Your Email</FormLabel>
            <Input
              mb={4}
              type="email"
              placeholder="Insert your email"
              disabled={isScheduling}
              value={guestEmail}
              onKeyPress={event =>
                event.key === 'Enter' && isGuestEmailValid && handleConfirm()
              }
              onChange={e => setGuestEmail(e.target.value)}
            />
          </FormControl>

          <FormControl>
            <FormLabel>What is this meeting about? (optional)</FormLabel>
            <Textarea
              disabled={isScheduling}
              placeholder="Any information you want to share prior to the meeting?"
              value={content}
              onChange={e => setContent(e.target.value)}
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
              disabled={isScheduling}
              value={name}
              onKeyPress={event =>
                event.key === 'Enter' && isNameEmpty && handleConfirm()
              }
              onChange={e => setName(e.target.value)}
            />
          </FormControl>
          <FormControl>
            <FormLabel>What is this meeting about? (optional)</FormLabel>
            <Textarea
              disabled={isScheduling}
              placeholder="Any information you want to share prior to the meeting?"
              value={content}
              onChange={e => setContent(e.target.value)}
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
              disabled={isScheduling}
              value={meetingUrl}
              onChange={e => setMeetingUrl(e.target.value)}
            />
          )}
          {scheduleType === SchedulingType.REGULAR && (
            <HStack alignItems="center">
              <Switch
                display="flex"
                colorScheme="primary"
                size="md"
                mr={4}
                isDisabled={isScheduling}
                defaultChecked={false}
                onChange={e => setSendEmailReminders(e.target.checked)}
              />
              <FormLabel mb="0">
                <Text>Send me email reminders</Text>
              </FormLabel>
            </HStack>
          )}
          {doSendEmailReminders && (
            <FormControl isInvalid={!isUserEmailValid}>
              <Input
                type="text"
                disabled={isScheduling}
                value={userEmail}
                onChange={e => setUserEmail(e.target.value)}
              />
            </FormControl>
          )}
        </VStack>
      )}

      <Button
        width="full"
        disabled={
          (!logged && !isGuestEmailValid) ||
          (logged &&
            ((doSendEmailReminders && !isUserEmailValid) || isNameEmpty)) ||
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

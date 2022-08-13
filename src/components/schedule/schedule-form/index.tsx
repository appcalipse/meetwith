import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Icon,
  Input,
  Link,
  Switch,
  Text,
  Textarea,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { useContext, useState } from 'react'
import { FaInfo } from 'react-icons/fa'

import { AccountContext } from '../../../providers/AccountProvider'
import { useLogin } from '../../../session/login'
import { ButtonType, Color } from '../../../styles/theme'
import { SchedulingType } from '../../../types/Meeting'
import { isValidEmail } from '../../../utils/validations'

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
  const [scheduleType, setScheduleType] = useState(
    undefined as SchedulingType | undefined
  )
  const [guestEmail, setGuestEmail] = useState('')
  const [meetingUrl, setMeetingUrl] = useState('')

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
    if (type === SchedulingType.REGULAR) {
      await handleLogin()
    }
  }

  const isEmailValid = isValidEmail(guestEmail)

  const bgColor = useColorModeValue('white', 'gray.600')
  const iconColor = useColorModeValue('gray.600', 'white')

  return (
    <Box>
      <FormLabel>Your name (optional)</FormLabel>
      <Input
        type="text"
        disabled={isScheduling}
        placeholder="Your name or an identifier (if you want to provide)"
        value={name}
        onChange={e => setName(e.target.value)}
        mb={4}
      />

      <FormLabel>Information (optional)</FormLabel>
      <Textarea
        type="text"
        disabled={isScheduling}
        placeholder="Any information you want to share prior to the meeting?"
        value={content}
        onChange={e => setContent(e.target.value)}
      />

      <HStack my={6} alignItems="center">
        <Switch
          display="flex"
          colorScheme={Color.ORANGE}
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
                Huddle01 is a web3-powered video conferencing tailored for DAOs
                and NFT communities.
              </Text>
              <Tooltip.Arrow />
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      </HStack>

      {customMeeting && (
        <Input
          mb={4}
          type="text"
          placeholder="insert a custom meeting url"
          disabled={isScheduling}
          value={meetingUrl}
          onChange={e => setMeetingUrl(e.target.value)}
        />
      )}

      {!logged && (
        <Text textAlign="left" color={Color.GRAY} mb="4">
          Please{' '}
          <Button
            variant={ButtonType.LINK}
            colorScheme={Color.ORANGE}
            onClick={() => handleScheduleType(SchedulingType.REGULAR)}
          >
            sign in with wallet
          </Button>{' '}
          or{' '}
          <Button
            variant={ButtonType.LINK}
            colorScheme={Color.ORANGE}
            onClick={() => handleScheduleType(SchedulingType.GUEST)}
          >
            schedule as guest
          </Button>
          .
        </Text>
      )}

      {scheduleType === SchedulingType.GUEST && (
        <FormControl isInvalid={!isEmailValid}>
          <Input
            autoFocus
            mb={4}
            type="email"
            placeholder="insert your email"
            disabled={isScheduling}
            value={guestEmail}
            onKeyPress={event =>
              event.key === 'Enter' && isEmailValid && handleConfirm()
            }
            onChange={e => setGuestEmail(e.target.value)}
          />
        </FormControl>
      )}

      <Button
        isFullWidth
        disabled={
          (!logged && !isEmailValid) ||
          isScheduling ||
          isSchedulingExternal ||
          isGateValid === false
        }
        isLoading={isScheduling || isSchedulingExternal}
        onClick={handleConfirm}
        colorScheme={Color.ORANGE}
        mt={2}
      >
        {isScheduling ? 'Scheduling...' : 'Schedule'}
      </Button>
    </Box>
  )
}

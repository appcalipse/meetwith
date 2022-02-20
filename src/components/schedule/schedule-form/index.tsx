import {
  Box,
  Button,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Link,
  Switch,
  Text,
  Textarea,
  useToast,
} from '@chakra-ui/react'
import { useContext, useState } from 'react'

import { AccountContext } from '../../../providers/AccountProvider'
import { useLogin } from '../../../session/login'
import { SchedulingType } from '../../../types/Meeting'
import { isValidEmail } from '../../../utils/validations'

interface ScheduleFormProps {
  pickedTime: Date
  isSchedulingExternal: boolean
  willStartScheduling: (isScheduling: boolean) => void
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
  onConfirm,
}) => {
  const { handleLogin } = useLogin()
  const { currentAccount, logged } = useContext(AccountContext)

  const toast = useToast()

  const [content, setContent] = useState('')
  const [name, setName] = useState('')
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

      <HStack my={4}>
        <Switch
          colorScheme="orange"
          size="lg"
          mr={4}
          isDisabled={isScheduling}
          defaultChecked={!customMeeting}
          onChange={e => setCustomMeeting(!e.target.checked)}
        />
        <FormLabel mb="0">
          <Text color="gray">
            Use{' '}
            <Link isExternal href="https://huddle01.com">
              Huddle01
            </Link>{' '}
            for your meetings (a link will be generated for you). Huddle01 is a
            web3-powered video conferencing tailored for DAOs and NFT
            communities.
          </Text>
        </FormLabel>
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
        <Text textAlign="left" color="gray" mb="4">
          Please{' '}
          <Button
            variant="link"
            colorScheme="orange"
            onClick={() => handleScheduleType(SchedulingType.REGULAR)}
          >
            sign in with wallet
          </Button>{' '}
          or{' '}
          <Button
            variant="link"
            colorScheme="orange"
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
            onChange={e => setGuestEmail(e.target.value)}
          />
        </FormControl>
      )}

      <Button
        isFullWidth
        disabled={
          (!logged && !isEmailValid) || isScheduling || isSchedulingExternal
        }
        isLoading={isScheduling || isSchedulingExternal}
        onClick={handleConfirm}
        colorScheme="orange"
        mt={2}
      >
        {isScheduling ? 'Scheduling...' : 'Schedule'}
      </Button>
    </Box>
  )
}

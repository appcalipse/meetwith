import {
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
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
  useToast,
} from '@chakra-ui/react'
import { addHours, addMinutes } from 'date-fns'
import { zonedTimeToUtc } from 'date-fns-tz'
import NextLink from 'next/link'
import { useContext, useEffect, useState } from 'react'

import { ChipInput } from '@/components/chip-input'
import { SingleDatepicker } from '@/components/input-date-picker'
import { InputTimePicker } from '@/components/input-time-picker'
import { AccountContext } from '@/providers/AccountProvider'
import { DBSlot, MeetingDecrypted } from '@/types/Meeting'
import { logEvent } from '@/utils/analytics'
import { updateMeeting } from '@/utils/calendar_manager'
import {
  MeetingChangeConflictError,
  MeetingCreationError,
  MeetingWithYourselfError,
  TimeNotAvailableError,
} from '@/utils/errors'
import { getSignature } from '@/utils/storage'
import { isProAccount } from '@/utils/subscription_manager'
import { ParseTime } from '@/utils/time.helper'
import { getAddressDisplayForInput } from '@/utils/user_manager'

export interface EditMeetingModalProps {
  isOpen: boolean
  onOpen: () => void
  onClose: (meeting?: DBSlot) => void
  meeting: DBSlot
  timezone: string
  decrypted: MeetingDecrypted
}

export const EditMeetingDialog: React.FC<EditMeetingModalProps> = ({
  isOpen,
  onOpen,
  onClose,
  timezone,
  decrypted,
}) => {
  const { currentAccount } = useContext(AccountContext)
  const [useHuddle, setHuddle] = useState(
    decrypted.meeting_url.includes('huddle01.com')
  )
  const toast = useToast()

  const [participants, setParticipants] = useState(
    decrypted.participants.map(it => it.account_address!)
  )
  const [selectedDate, setDate] = useState(decrypted.start)
  const [selectedTime, setTime] = useState('')
  const [content, setContent] = useState(decrypted.content)
  const [inputError, setInputError] = useState(undefined as object | undefined)
  const [meetingUrl, setMeetingUrl] = useState(decrypted.meeting_url)
  const [duration, setDuration] = useState(30)
  const [isScheduling, setIsScheduling] = useState(false)

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setParticipants(decrypted.participants.map(it => it.account_address!))
    setContent(decrypted.content)
    setMeetingUrl(decrypted.meeting_url)
    setDate(decrypted.start)
    setTime(ParseTime(decrypted.start))
    setDuration(30)
    setLoading(false)
  }, [decrypted])

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

  const onUpdateMeetingClick = async () => {
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

    setIsScheduling(true)

    const _start = new Date(selectedDate)
    _start.setHours(Number(selectedTime.split(':')[0]))
    _start.setMinutes(Number(selectedTime.split(':')[1]))
    _start.setSeconds(0)

    const start = zonedTimeToUtc(
      _start,
      Intl.DateTimeFormat().resolvedOptions().timeZone
    )
    const end = addMinutes(new Date(start), duration)

    decrypted.content = content
    decrypted.meeting_url = meetingUrl

    try {
      const meeting = await updateMeeting(
        currentAccount!.address,
        'no_type',
        start,
        end,
        decrypted,
        getSignature(currentAccount!.address) || '',
        participants
      )
      logEvent('Updated a meeting', {
        fromDashboard: true,
        participantsSize: participants.length,
      })
      onClose({
        id: meeting.id,
        created_at: new Date(meeting.created_at!),
        account_address: currentAccount!.address,
        meeting_info_file_path: meeting.meeting_info_file_path,
        start: new Date(meeting.start),
        end: new Date(meeting.end),
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
          title: 'Failed to update meeting',
          description: 'The selected time is not available anymore',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof MeetingCreationError) {
        toast({
          title: 'Failed to update meeting',
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
      } else throw e
    }
    setIsScheduling(false)
  }

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
          <Heading size={'md'}>Edit your meeting details</Heading>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <FormControl>
            <FormLabel htmlFor="participants">Participants</FormLabel>
            <ChipInput
              currentItems={participants}
              placeholder="Insert wallet addresses"
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
          <FormControl sx={{ marginTop: '24px' }}>
            <FormLabel htmlFor="date">When</FormLabel>
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
            </HStack>
          </FormControl>
          <FormControl sx={{ marginTop: '24px' }}>
            <FormLabel htmlFor="info">Information (optional)</FormLabel>
            <Textarea
              id="info"
              type="text"
              lineHeight={1}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Any information you want to share prior to the meeting?"
            />
          </FormControl>
          <FormControl sx={{ marginTop: '24px' }}>
            <FormLabel>Meeting link</FormLabel>
            <FormControl display="flex" alignItems="center">
              <Switch
                id="email-alerts"
                colorScheme={'orange'}
                defaultChecked={useHuddle}
                isChecked={useHuddle}
                onChange={() => setHuddle(value => !value)}
              />
              <FormLabel
                htmlFor="email-alerts"
                mb="0"
                sx={{ paddingLeft: '16px', fontWeight: 'normal' }}
              >
                <Text>
                  Use{' '}
                  <Link href="https://huddle01.com/" target={'_blank'}>
                    Huddle01
                  </Link>{' '}
                  for your meetings (a link will be generated for you).
                </Text>
                <Text>
                  Huddle01 is a web3-powered video conferencing tailored for
                  DAOs and NFT communities.
                </Text>
              </FormLabel>
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
            onClick={onUpdateMeetingClick}
            colorScheme={'orange'}
            isLoading={isScheduling}
          >
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

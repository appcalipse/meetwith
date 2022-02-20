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
import { useContext, useEffect, useState } from 'react'

import { AccountContext } from '../../../providers/AccountProvider'
import { SchedulingType } from '../../../types/Meeting'
import { logEvent } from '../../../utils/analytics'
import { scheduleMeeting } from '../../../utils/calendar_manager'
import { MeetingWithYourselfError } from '../../../utils/errors'
import { getAddressDisplayForInput } from '../../../utils/user_manager'
import { ChipInput } from '../../chip-input'
import { SingleDatepicker } from '../../input-date-picker'
import { InputTimePicker } from '../../input-time-picker'

export interface ScheduleModalProps {
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  onOpen,
  onClose,
}) => {
  const { currentAccount } = useContext(AccountContext)
  const [useHuddle, setHuddle] = useState(true)
  const toast = useToast()

  const [participants, setParticipants] = useState([] as string[])
  const [selectedDate, setDate] = useState(new Date())
  const [selectedTime, setTime] = useState('')
  const [content, setContent] = useState('')
  const [meetingUrl, setMeetingUrl] = useState('')
  const [duration, setDuration] = useState(30)
  const [isScheduling, setIsScheduling] = useState(false)

  const clearInfo = () => {
    setParticipants([])
    setDate(new Date())
    const minutes = Math.ceil(new Date().getMinutes() / 10) * 10
    setTime(
      (minutes < 60
        ? new Date().getHours()
        : addHours(new Date(), 1).getHours()) +
        ':' +
        (minutes < 60 ? minutes : '00')
    )
    setContent('')
    setMeetingUrl('')
    setDuration(30)
    setIsScheduling(false)
  }

  useEffect(() => {
    clearInfo()
  }, [isOpen])

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

    setIsScheduling(true)

    const _start = new Date(selectedDate)
    _start.setHours(Number(selectedTime.split(':')[0]))
    _start.setMinutes(Number(selectedTime.split(':')[1]))

    const start = zonedTimeToUtc(
      _start,
      currentAccount?.preferences?.timezone ||
        Intl.DateTimeFormat().resolvedOptions().timeZone
    )
    const end = addMinutes(new Date(start), duration)

    try {
      const meeting = await scheduleMeeting(
        SchedulingType.REGULAR,
        currentAccount!.address,
        [
          ...Array.from(new Set(participants.map(p => p.toLowerCase()))).filter(
            p => p !== currentAccount!.address.toLowerCase()
          ),
        ],
        'no_type',
        start,
        end,
        currentAccount!.address,
        '',
        currentAccount!.name,
        content,
        meetingUrl
      )
      logEvent('Scheduled a meeting', {
        fromDashboard: true,
        participantsSize: meeting.participants.length,
      })
      clearInfo()
      onClose()
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
      } else throw e
    }
    setIsScheduling(false)
    return false
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
          <Heading size={'md'}>Schedule a new meeting</Heading>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <FormControl>
            <FormLabel htmlFor="participants">Participants</FormLabel>
            <ChipInput
              placeholder="Insert wallet addresses"
              onChange={setParticipants}
              renderItem={item => {
                return getAddressDisplayForInput(item)
              }}
            />
            <FormHelperText>
              Separate participants by comma. You will be added automatically,
              no need to insert yourself
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

import { useDisclosure } from '@chakra-ui/hooks'
import { Box, Container, Flex } from '@chakra-ui/layout'
import { Select } from '@chakra-ui/select'
import { useToast } from '@chakra-ui/toast'
import * as Sentry from '@sentry/browser'
import { addMinutes, endOfMonth, startOfMonth } from 'date-fns'
import { zonedTimeToUtc } from 'date-fns-tz'
import { useRouter } from 'next/router'
import React, { useContext, useEffect, useState } from 'react'

import { AccountContext } from '../../providers/AccountProvider'
import { Account, MeetingType } from '../../types/Account'
import { DBSlot, MeetingDecrypted, SchedulingType } from '../../types/Meeting'
import { logEvent } from '../../utils/analytics'
import {
  getBusySlots,
  getNotificationSubscriptions,
} from '../../utils/api_helper'
import {
  durationToHumanReadable,
  getAccountDomainUrl,
  isSlotAvailable,
  scheduleMeeting,
} from '../../utils/calendar_manager'
import {
  MeetingCreationError,
  MeetingWithYourselfError,
  TimeNotAvailableError,
} from '../../utils/errors'
import { saveMeetingsScheduled } from '../../utils/storage'
import { getAccountDisplayName } from '../../utils/user_manager'
import { Head } from '../Head'
import MeetingScheduledDialog from '../meeting/MeetingScheduledDialog'
import MeetSlotPicker from '../MeetSlotPicker'
import ProfileInfo from '../profile/ProfileInfo'
import TokenGateValidation from '../token-gate/TokenGateValidation'

interface InternalSchedule {
  scheduleType: SchedulingType
  startTime: Date
  guestEmail: string
  name?: string
  content?: string
  meetingUrl?: string
}

interface PublicCalendarProps {
  url: string
  account: Account
  serverSideRender: boolean
}

const PublicCalendar: React.FC<PublicCalendarProps> = ({
  url,
  account,
  serverSideRender,
}) => {
  const [isSSR, setIsSSR] = useState(serverSideRender)
  useEffect(() => {
    setIsSSR(false)
  }, [])

  const router = useRouter()

  const { currentAccount, logged } = useContext(AccountContext)

  const [checkingSlots, setCheckingSlots] = useState(false)
  const [unloggedSchedule, setUnloggedSchedule] = useState(
    null as InternalSchedule | null
  )

  useEffect(() => {
    const typeOnRoute = router.query.address ? router.query.address[1] : null
    const type = account.preferences!.availableTypes.find(
      t => t.url === typeOnRoute
    )
    setSelectedType(type || account.preferences!.availableTypes[0])
    updateMeetings(account.address)
  }, [account, router.query.address])

  useEffect(() => {
    if (logged && unloggedSchedule) {
      confirmSchedule(
        unloggedSchedule.scheduleType,
        unloggedSchedule.startTime,
        unloggedSchedule.guestEmail,
        unloggedSchedule.name,
        unloggedSchedule.content,
        unloggedSchedule.meetingUrl
      )
    }
  }, [currentAccount])

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [meetings, setMeetings] = useState([] as DBSlot[])
  const [selectedType, setSelectedType] = useState({} as MeetingType)
  const [isGateValid, setIsGateValid] = useState<boolean | undefined>(undefined)
  const [isScheduling, setIsScheduling] = useState(false)
  const [readyToSchedule, setReadyToSchedule] = useState(false)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [reset, setReset] = useState(false)
  const [lastScheduledMeeting, setLastScheduledMeeting] = useState(
    undefined as MeetingDecrypted | undefined
  )
  const [notificationsSubs, setNotificationSubs] = useState(0)

  const toast = useToast()

  const fetchNotificationSubscriptions = async () => {
    const subs = await getNotificationSubscriptions()
    setNotificationSubs(subs.notification_types.length)
  }

  const confirmSchedule = async (
    scheduleType: SchedulingType,
    startTime: Date,
    guestEmail?: string,
    name?: string,
    content?: string,
    meetingUrl?: string
  ): Promise<boolean> => {
    setUnloggedSchedule(null)
    setIsScheduling(true)

    const start = zonedTimeToUtc(
      startTime,
      Intl.DateTimeFormat().resolvedOptions().timeZone
    )
    const end = addMinutes(new Date(start), selectedType.duration)

    const targetName = getAccountDisplayName(account!)
    if (scheduleType !== SchedulingType.GUEST && !name) {
      name = getAccountDisplayName(currentAccount!)
    }
    try {
      const meeting = await scheduleMeeting(
        scheduleType,
        account!.address,
        [],
        selectedType.id,
        start,
        end,
        currentAccount?.address,
        guestEmail,
        name,
        targetName,
        content,
        meetingUrl
      )
      await updateMeetings(account!.address)
      currentAccount && saveMeetingsScheduled(currentAccount!.address)
      currentAccount && (await fetchNotificationSubscriptions())
      setLastScheduledMeeting(meeting)
      logEvent('Scheduled a meeting', {
        fromPublicCalendar: true,
        participantsSize: 2,
      })
      onOpen()
      setIsScheduling(false)
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
      } else throw e
    }
    setIsScheduling(false)
    return false
  }

  const _onClose = () => {
    setReset(true)
    onClose()
    setTimeout(() => setReset(false), 200)
  }

  const updateMeetings = async (identifier: string) => {
    setCheckingSlots(true)
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)

    try {
      const meetings = await getBusySlots(identifier, monthStart, monthEnd)
      setMeetings(meetings)
    } catch (e) {
      Sentry.captureException(e)
      toast({
        title: 'Ops!',
        description: 'Something went wrong :(',
        status: 'error',
        duration: 5000,
        position: 'top',
        isClosable: true,
      })
      router.push('/404')
    }

    setCheckingSlots(false)
  }

  useEffect(() => {
    updateMeetings(account.address)
  }, [currentMonth])

  const changeType = (typeId: string) => {
    const type = account!.preferences!.availableTypes.find(
      t => t.id === typeId
    )!
    setSelectedType(type)
    router.push(`/${getAccountDomainUrl(account!)}/${type.url}`, undefined, {
      shallow: true,
    })
    if (!type.scheduleGate) {
      setIsGateValid(undefined)
    }
  }

  const validateSlot = (slot: Date): boolean => {
    return isSlotAvailable(
      selectedType.duration,
      selectedType.minAdvanceTime,
      slot,
      meetings,
      account!.preferences!.availabilities,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      account!.preferences!.timezone
    )
  }

  return (
    <>
      <Head
        title={`${getAccountDisplayName(
          account
        )}'s calendar on Meet with Wallet - Schedule a meeting in #web3 style`}
        description={
          account.preferences?.description ||
          'Schedule a meeting by simply connecting your web3 wallet, or use your email and schedule as a guest.'
        }
        url={url}
      />
      <Container maxW="7xl" mt={8} flex={1}>
        <Box>
          <Flex wrap="wrap" justifyContent="center">
            <Box
              flex="1"
              minW={{ base: '300px', md: '500px' }}
              maxW="600px"
              p={8}
            >
              <ProfileInfo account={account!} />
              <Select
                disabled={readyToSchedule}
                placeholder="Select option"
                mt={8}
                value={selectedType.id}
                onChange={e => e.target.value && changeType(e.target.value)}
              >
                {account!.preferences!.availableTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.title ? `${type.title} - ` : ''}
                    {durationToHumanReadable(type.duration)}
                  </option>
                ))}
              </Select>
              {selectedType.scheduleGate && (
                <TokenGateValidation
                  gate={selectedType.scheduleGate}
                  targetAccount={account}
                  userAccount={currentAccount!}
                  setIsGateValid={setIsGateValid}
                  isGateValid={isGateValid!}
                />
              )}
            </Box>
            {isSSR ? null : (
              <Box flex="2" p={8}>
                <MeetSlotPicker
                  reset={reset}
                  onMonthChange={(day: Date) => setCurrentMonth(day)}
                  onSchedule={confirmSchedule}
                  willStartScheduling={willStartScheduling => {
                    setReadyToSchedule(willStartScheduling)
                  }}
                  isSchedulingExternal={isScheduling}
                  slotDurationInMinutes={selectedType.duration}
                  checkingSlots={checkingSlots}
                  timeSlotAvailability={validateSlot}
                  isGateValid={isGateValid}
                />
              </Box>
            )}
          </Flex>
          {isSSR ? null : (
            <MeetingScheduledDialog
              targetAccount={account!}
              schedulerAccount={currentAccount!}
              meeting={lastScheduledMeeting}
              accountNotificationSubs={notificationsSubs}
              isOpen={isOpen}
              onClose={_onClose}
            />
          )}
        </Box>
      </Container>
    </>
  )
}
export default PublicCalendar

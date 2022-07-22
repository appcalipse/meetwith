import { useDisclosure } from '@chakra-ui/hooks'
import { Box, Container, Flex, Text } from '@chakra-ui/layout'
import { Select } from '@chakra-ui/select'
import { useToast } from '@chakra-ui/toast'
import * as Sentry from '@sentry/browser'
import {
  addMinutes,
  endOfMonth,
  format,
  Interval,
  isAfter,
  isBefore,
  isEqual,
  startOfMonth,
  subMinutes,
} from 'date-fns'
import { zonedTimeToUtc } from 'date-fns-tz'
import { useRouter } from 'next/router'
import React, { useContext, useEffect, useState } from 'react'

import { saveMeetingsScheduled } from '@/utils/storage'
import { getAccountDisplayName } from '@/utils/user_manager'

import { AccountContext } from '../../providers/AccountProvider'
import { Account, MeetingType } from '../../types/Account'
import {
  MeetingDecrypted,
  SchedulingType,
  TeamMeetingRequest,
  TeamMeetingType,
} from '../../types/Meeting'
import { logEvent } from '../../utils/analytics'
import {
  getAccount,
  getBusySlots,
  getBusySlotsForMultipleAccounts,
  getNotificationSubscriptions,
} from '../../utils/api_helper'
import {
  durationToHumanReadable,
  getAccountDomainUrl,
  isSlotAvailable,
  scheduleMeeting,
} from '../../utils/calendar_manager'
import {
  GateConditionNotValidError,
  MeetingCreationError,
  MeetingWithYourselfError,
  TimeNotAvailableError,
} from '../../utils/errors'
import { Head } from '../Head'
import MeetingScheduledDialog from '../meeting/MeetingScheduledDialog'
import MeetSlotPicker from '../MeetSlotPicker'
import ProfileInfo from '../profile/ProfileInfo'
import TokenGateValidation from '../token-gate/TokenGateValidation'
import TeamScheduleCalendarProfile from './TeamScheduleCalendarProfile'

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
  account?: Account
  teamMeetingRequest?: TeamMeetingRequest
  serverSideRender: boolean
}

enum CalendarType {
  REGULAR,
  TEAM,
}
const PublicCalendar: React.FC<PublicCalendarProps> = ({
  url,
  account,
  teamMeetingRequest,
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
  const [teamAccounts, setTeamAccounts] = useState<Account[]>([])

  const calendarType =
    account !== undefined ? CalendarType.REGULAR : CalendarType.TEAM

  const hidrateTeamAccounts = async () => {
    let accountstoFetch: string[] = []
    if (teamMeetingRequest!.type === TeamMeetingType.TEAM) {
      // to be implemented
    } else {
      accountstoFetch = teamMeetingRequest!.participants_accounts!
    }
    const accounts: Account[] = []
    await Promise.all(
      accountstoFetch.map(async account =>
        accounts.push(await getAccount(account))
      )
    )
    setTeamAccounts(accounts)
  }

  useEffect(() => {
    if (calendarType === CalendarType.TEAM) {
      hidrateTeamAccounts()
    }
  }, [calendarType])

  useEffect(() => {
    if (calendarType === CalendarType.REGULAR) {
      const typeOnRoute = router.query.address ? router.query.address[1] : null
      const type = account!.preferences!.availableTypes.find(
        t => t.url === typeOnRoute
      )
      setSelectedType(type || account!.preferences!.availableTypes[0])
      updateSlots()
    }
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
  const [busySlots, setBusyslots] = useState([] as Interval[])
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
    const end = addMinutes(
      new Date(start),
      CalendarType.REGULAR === calendarType
        ? selectedType.duration
        : teamMeetingRequest!.duration_in_minutes
    )

    if (scheduleType !== SchedulingType.GUEST && !name) {
      name = getAccountDisplayName(currentAccount!)
    }

    const target =
      CalendarType.REGULAR === calendarType
        ? account!.address
        : teamMeetingRequest?.participants_accounts?.includes(
            teamMeetingRequest!.owner
          )
        ? teamMeetingRequest!.owner
        : teamMeetingRequest!.participants_accounts![0]

    const targetName =
      CalendarType.REGULAR === calendarType
        ? getAccountDisplayName(account!)
        : ''

    const participants =
      CalendarType.REGULAR === calendarType
        ? []
        : teamMeetingRequest!.participants_accounts!

    try {
      const meeting = await scheduleMeeting(
        scheduleType,
        target,
        participants,
        'no_type',
        start,
        end,
        currentAccount?.address,
        guestEmail,
        name,
        targetName,
        content,
        meetingUrl
      )
      await updateSlots()
      currentAccount && saveMeetingsScheduled(currentAccount!.address)
      currentAccount && (await fetchNotificationSubscriptions())
      setLastScheduledMeeting(meeting)
      logEvent('Scheduled a meeting', {
        fromPublicCalendar: true,
        participantsSize: meeting.participants.length,
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

  const updateSlots = async () => {
    setCheckingSlots(true)
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)

    try {
      if (calendarType === CalendarType.REGULAR) {
        const busySlots = await getBusySlots(
          account!.address,
          monthStart,
          monthEnd
        )
        setBusyslots(busySlots)
      } else {
        let accounts: string[] = []
        if (teamMeetingRequest!.type === TeamMeetingType.TEAM) {
          // to be implemented
        } else {
          accounts = teamMeetingRequest!.participants_accounts!
        }
        const busySlots = await getBusySlotsForMultipleAccounts(
          accounts,
          monthStart,
          monthEnd
        )
        setBusyslots(busySlots)
      }
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
    updateSlots()
  }, [currentMonth])

  const changeType = (typeId: string) => {
    const type = account!.preferences!.availableTypes.find(
      t => t.id === typeId
    )!
    if (!type.scheduleGate) {
      setIsGateValid(undefined)
    }
    setSelectedType(type)
    router.push(`/${getAccountDomainUrl(account!)}/${type.url}`, undefined, {
      shallow: true,
    })
  }

  const validateSlot = (slot: Date): boolean => {
    if (calendarType === CalendarType.REGULAR) {
      return isSlotAvailable(
        selectedType.duration,
        selectedType.minAdvanceTime,
        slot,
        busySlots,
        account!.preferences!.availabilities,
        Intl.DateTimeFormat().resolvedOptions().timeZone,
        account!.preferences!.timezone
      )
    } else {
      if (
        !isAfter(slot, new Date(teamMeetingRequest!.range_start)) &&
        !isEqual(slot, new Date(teamMeetingRequest!.range_start))
      ) {
        return false
      }

      if (
        !isBefore(
          slot,
          subMinutes(
            new Date(teamMeetingRequest!.range_end),
            teamMeetingRequest!.duration_in_minutes
          )
        ) &&
        !isEqual(
          slot,
          subMinutes(
            new Date(teamMeetingRequest!.range_end),
            teamMeetingRequest!.duration_in_minutes
          )
        )
      ) {
        return false
      }

      for (const eachAccount of teamAccounts) {
        if (
          !isSlotAvailable(
            teamMeetingRequest!.duration_in_minutes,
            0,
            slot,
            busySlots,
            eachAccount.preferences!.availabilities,
            Intl.DateTimeFormat().resolvedOptions().timeZone,
            eachAccount!.preferences!.timezone
          )
        ) {
          return false
        }
      }
      return true
    }
  }

  return (
    <>
      <HeadMeta
        account={account}
        teamMeetingRequest={teamMeetingRequest}
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
              {calendarType === CalendarType.REGULAR ? (
                <ProfileInfo account={account!} />
              ) : (
                <TeamScheduleCalendarProfile accounts={teamAccounts} />
              )}
              {calendarType === CalendarType.REGULAR && (
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
              )}
              {CalendarType.REGULAR && selectedType.scheduleGate ? (
                <TokenGateValidation
                  gate={selectedType.scheduleGate}
                  targetAccount={account!}
                  userAccount={currentAccount!}
                  setIsGateValid={setIsGateValid}
                  isGateValid={isGateValid!}
                />
              ) : null}
              {calendarType === CalendarType.TEAM && (
                <Text textAlign="center" mt={4}>{`Pick a slot between ${format(
                  new Date(teamMeetingRequest!.range_start),
                  'PPPpp'
                )} and ${format(
                  new Date(teamMeetingRequest!.range_end),
                  'PPPpp'
                )}`}</Text>
              )}
            </Box>
            {isSSR ? null : (
              <Box flex="2" p={8}>
                <MeetSlotPicker
                  reset={reset}
                  onMonthChange={(day: Date) => setCurrentMonth(day)}
                  availabilityInterval={
                    teamMeetingRequest
                      ? {
                          start: new Date(teamMeetingRequest.range_start),
                          end: new Date(teamMeetingRequest.range_end),
                        }
                      : undefined
                  }
                  onSchedule={confirmSchedule}
                  willStartScheduling={willStartScheduling => {
                    setReadyToSchedule(willStartScheduling)
                  }}
                  isSchedulingExternal={isScheduling}
                  slotDurationInMinutes={
                    CalendarType.REGULAR === calendarType
                      ? selectedType.duration
                      : teamMeetingRequest!.duration_in_minutes
                  }
                  checkingSlots={checkingSlots}
                  timeSlotAvailability={validateSlot}
                  isGateValid={isGateValid!}
                />
              </Box>
            )}
          </Flex>
          {isSSR
            ? null
            : lastScheduledMeeting && (
                <MeetingScheduledDialog
                  participants={lastScheduledMeeting!.participants}
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

const HeadMeta: React.FC<{
  account?: Account
  teamMeetingRequest?: TeamMeetingRequest
  url: string
}> = ({ account, teamMeetingRequest, url }) => {
  const title = account
    ? `${getAccountDisplayName(
        account
      )}'s calendar on Meet with Wallet - Schedule a meeting in #web3 style`
    : teamMeetingRequest?.title ||
      'Meet with Wallet - Schedule a meeting in #web3 style'

  const description =
    account?.preferences?.description ||
    'Schedule a meeting by simply connecting your web3 wallet, or use your email and schedule as a guest.'

  return <Head title={title} description={description} url={url} />
}
export default PublicCalendar

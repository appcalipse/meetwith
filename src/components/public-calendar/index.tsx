/* eslint-disable react-hooks/exhaustive-deps */
import { Box, Container, Flex, Text } from '@chakra-ui/layout'
import { Button, Spinner } from '@chakra-ui/react'
import { Select } from '@chakra-ui/select'
import { useToast } from '@chakra-ui/toast'
import * as Sentry from '@sentry/nextjs'
import {
  addDays,
  addMinutes,
  addMonths,
  areIntervalsOverlapping,
  Day,
  endOfMonth,
  format,
  getDay,
  Interval,
  isAfter,
  isBefore,
  isEqual,
  isFuture,
  nextDay,
  setHours,
  setMinutes,
  setSeconds,
  startOfMonth,
  subDays,
  subMinutes,
  subMonths,
  subSeconds,
} from 'date-fns'
import { zonedTimeToUtc } from 'date-fns-tz'
import { useRouter } from 'next/router'
import React, { useContext, useEffect, useState } from 'react'

import { AccountContext } from '@/providers/AccountProvider'
import { Account, MeetingType } from '@/types/Account'
import { AccountNotifications } from '@/types/AccountNotifications'
import { ConnectedCalendarCore } from '@/types/CalendarConnections'
import { ConditionRelation } from '@/types/common'
import {
  DBSlot,
  GroupMeetingRequest,
  GroupMeetingType,
  MeetingDecrypted,
  SchedulingType,
  TimeSlotSource,
} from '@/types/Meeting'
import {
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '@/types/ParticipantInfo'
import { logEvent } from '@/utils/analytics'
import {
  fetchBusySlotsForMultipleAccounts,
  getAccount,
  getBusySlots,
  getMeeting,
  getNotificationSubscriptions,
  listConnectedCalendars,
} from '@/utils/api_helper'
import {
  dateToHumanReadable,
  durationToHumanReadable,
  getAccountDomainUrl,
  scheduleMeeting,
} from '@/utils/calendar_manager'
import {
  GateConditionNotValidError,
  Huddle01ServiceUnavailable,
  InvalidURL,
  MeetingCreationError,
  MeetingWithYourselfError,
  TimeNotAvailableError,
} from '@/utils/errors'
import {
  getAvailabilitiesForWeekDay,
  getBlockedAvailabilities,
} from '@/utils/slots.helper'
import { isSlotAvailable } from '@/utils/slots.helper'
import { saveMeetingsScheduled } from '@/utils/storage'
import { getAccountDisplayName } from '@/utils/user_manager'

import { Head } from '../Head'
import MeetingScheduledDialog from '../meeting/MeetingScheduledDialog'
import MeetSlotPicker from '../MeetSlotPicker'
import ProfileInfo from '../profile/ProfileInfo'
import TokenGateValidation from '../token-gate/TokenGateValidation'
import GroupScheduleCalendarProfile from './GroupScheduleCalendarProfile'

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
  teamMeetingRequest?: GroupMeetingRequest
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

  const calendarType =
    account !== undefined ? CalendarType.REGULAR : CalendarType.TEAM

  const [schedulingType, setSchedulingType] = useState(SchedulingType.REGULAR)
  const [checkingSlots, setCheckingSlots] = useState(false)
  const [checkedSelfSlots, setCheckedSelfSlots] = useState(false)
  const [unloggedSchedule, setUnloggedSchedule] = useState(
    null as InternalSchedule | null
  )
  const [groupAccounts, setTeamAccounts] = useState<Account[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [busySlots, setBusyslots] = useState([] as Interval[])
  const [selfBusySlots, setSelfBusyslots] = useState([] as Interval[])
  const [selectedType, setSelectedType] = useState({} as MeetingType)
  const [isPrivateType, setPrivateType] = useState(false)
  const [isGateValid, setIsGateValid] = useState<boolean | undefined>(undefined)
  const [isScheduling, setIsScheduling] = useState(false)
  const [readyToSchedule, setReadyToSchedule] = useState(false)
  const [reset, setReset] = useState(false)
  const [lastScheduledMeeting, setLastScheduledMeeting] = useState(
    undefined as MeetingDecrypted | undefined
  )

  const [notificationsSubs, setNotificationSubs] = useState(0)
  const [hasConnectedCalendar, setHasConnectedCalendar] = useState(false)
  const [rescheduleSlotId, setRescheduleSlotId] = useState<string | undefined>(
    undefined
  )
  const [rescheduleSlot, setRescheduleSlot] = useState<DBSlot | undefined>(
    undefined
  )
  const [blockedDates, setBlockedDates] = useState<Date[]>([])

  const toast = useToast()

  const hidrateTeamAccounts = async () => {
    let accountstoFetch: string[] = []
    if (teamMeetingRequest!.team_structure.type === GroupMeetingType.TEAM) {
      // to be implemented
    } else {
      accountstoFetch =
        teamMeetingRequest!.team_structure.participants_accounts!
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
    const blockedAvailabilities = getBlockedAvailabilities(
      account?.preferences?.availabilities
    )
    // We need to take into consideration 1 month before the beginning of the month
    // and 1 month after the end of the month in the calculation due to Timezone
    // spans be able to be inside one month for one user and in another for other
    // user when we consider first and last days of the month.
    let startDate = subMonths(startOfMonth(currentMonth), 1)
    const endDate = addMonths(endOfMonth(currentMonth), 1)

    const unavailableDate = blockedAvailabilities.reduce((acc, curr) => {
      if (getDay(startDate) === curr.weekday) acc.push(startDate)
      let _nextDay = nextDay(startDate, curr.weekday as Day)
      while (isBefore(_nextDay, endDate)) {
        acc.push(_nextDay)
        _nextDay = nextDay(_nextDay, curr.weekday as Day)
      }
      return acc
    }, [] as Date[])

    if (isBefore(endDate, new Date())) {
      setBlockedDates(unavailableDate)
      return
    }

    if (isAfter(new Date(), startDate) && isBefore(new Date(), endDate)) {
      startDate = new Date()
    }

    let day = startDate
    while (!isAfter(day, endDate)) {
      const _availability = getAvailabilitiesForWeekDay(
        account?.preferences?.availabilities,
        day
      )
      if (_availability.length > 0) {
        const _availableSlots = _availability.reduce((acc, curr) => {
          const gap = selectedType.duration
          const startDate = setHours(
            setMinutes(setSeconds(day, 0), parseInt(curr.start.split(':')[1])),
            parseInt(curr.start.split(':')[0])
          )
          const endDate = setHours(
            setMinutes(setSeconds(day, 0), parseInt(curr.end.split(':')[1])),
            parseInt(curr.end.split(':')[0])
          )

          let _start = startDate
          let _end = subSeconds(addMinutes(_start, gap), 1)

          while (isBefore(_end, endDate)) {
            if (
              !busySlots.some(
                slot =>
                  !isEqual(slot.start, slot.end) &&
                  areIntervalsOverlapping(
                    {
                      start: _start,
                      end: _end,
                    },
                    {
                      start: slot.start,
                      end: subSeconds(slot.end, 1),
                    }
                  )
              )
            )
              acc.push({
                start: _start,
                end: _end,
              })

            _start = _end
            _end = addMinutes(_start, gap)
          }
          return acc
        }, [] as Interval[])
        if (_availableSlots.length === 0) unavailableDate.push(day)
      }
      day = addDays(day, 1)
    }
    setBlockedDates(unavailableDate)
  }, [currentMonth, selectedType, busySlots])

  useEffect(() => {
    if (calendarType === CalendarType.REGULAR) {
      const typeOnRoute = router.query.address ? router.query.address[1] : null
      const type = account!
        .preferences!.availableTypes.filter(type => !type.deleted)
        .find(t => t.url === typeOnRoute)
      setPrivateType(!!type?.private)
    }
  }, [])

  useEffect(() => {
    if (calendarType === CalendarType.TEAM) {
      hidrateTeamAccounts()
    }
  }, [calendarType])

  useEffect(() => {
    if (calendarType === CalendarType.REGULAR) {
      const typeOnRoute = router.query.address ? router.query.address[1] : null
      const type = account!
        .preferences!.availableTypes.filter(type => !type.deleted)
        .find(t => t.url === typeOnRoute)
      setSelectedType(type || account!.preferences!.availableTypes[0])
      updateSlots()
      setRescheduleSlotId(router.query.slot as string | undefined)
    }
  }, [account, router.query.address])

  useEffect(() => {
    getSlotInfo()
  }, [rescheduleSlotId])

  const getSlotInfo = async () => {
    if (rescheduleSlotId) {
      const slot = await getMeeting(rescheduleSlotId!)
      if (slot) {
        if (slot.account_address !== account!.address) {
          await router.push('/404')
        } else {
          setRescheduleSlot(slot)
        }
      }
    }
  }

  const fetchNotificationSubscriptions = async () => {
    let subs: AccountNotifications | null = null
    let connectedCalendars: ConnectedCalendarCore[] = []
    await Promise.all([
      (subs = await getNotificationSubscriptions()),
      (connectedCalendars = await listConnectedCalendars()),
    ])

    const validCals = connectedCalendars
      .filter(cal => cal.provider !== TimeSlotSource.MWW)
      .some(cal => cal.calendars.some(_cal => _cal.enabled))

    setNotificationSubs(subs.notification_types.length)
    setHasConnectedCalendar(!!validCals)
  }

  useEffect(() => {
    if (logged) {
      updateSelfSlots()
      fetchNotificationSubscriptions()

      if (unloggedSchedule) {
        confirmSchedule(
          unloggedSchedule.scheduleType,
          unloggedSchedule.startTime,
          unloggedSchedule.guestEmail,
          unloggedSchedule.name,
          unloggedSchedule.content,
          unloggedSchedule.meetingUrl
        )
      }
    }
  }, [currentAccount])

  const confirmSchedule = async (
    scheduleType: SchedulingType,
    startTime: Date,
    guestEmail?: string,
    name?: string,
    content?: string,
    meetingUrl?: string,
    emailToSendReminders?: string
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

    const participants: ParticipantInfo[] = []

    if (CalendarType.REGULAR === calendarType) {
      participants.push({
        account_address: account!.address,
        name: '',
        type: ParticipantType.Owner,
        status: ParticipationStatus.Accepted,
        slot_id: '',
        meeting_id: '',
      })
    } else {
      let alreadyAdded = ''
      if (
        teamMeetingRequest?.team_structure.participants_accounts?.includes(
          teamMeetingRequest!.owner
        )
      ) {
        participants.push({
          account_address: teamMeetingRequest!.owner,
          name: '',
          type: ParticipantType.Owner,
          status: ParticipationStatus.Pending,
          slot_id: '',
          meeting_id: '',
        })
        alreadyAdded = teamMeetingRequest!.owner
      } else {
        participants.push({
          account_address:
            teamMeetingRequest!.team_structure.participants_accounts![0],
          name: '',
          type: ParticipantType.Owner,
          status: ParticipationStatus.Pending,
          slot_id: '',
          meeting_id: '',
        })
        alreadyAdded =
          teamMeetingRequest!.team_structure.participants_accounts![0]
      }

      for (const address of teamMeetingRequest!.team_structure
        .participants_accounts!) {
        if (address !== alreadyAdded) {
          participants.push({
            account_address: address,
            name: '',
            type: ParticipantType.Invitee,
            status: ParticipationStatus.Pending,
            slot_id: '',
            meeting_id: '',
          })
        }
      }
    }

    setSchedulingType(scheduleType)

    if (scheduleType === SchedulingType.GUEST) {
      participants.push({
        account_address: currentAccount?.address,
        guest_email: guestEmail!,
        name,
        type: ParticipantType.Scheduler,
        status: ParticipationStatus.Accepted,
        slot_id: '',
        meeting_id: '',
      })
    } else {
      participants.push({
        account_address: currentAccount?.address,
        name,
        type: ParticipantType.Scheduler,
        status: ParticipationStatus.Accepted,
        slot_id: '',
        meeting_id: '',
      })
    }

    try {
      const meeting = await scheduleMeeting(
        scheduleType,
        'no_type',
        start,
        end,
        participants,
        currentAccount,
        content,
        meetingUrl,
        emailToSendReminders
      )
      await updateSlots()
      currentAccount && saveMeetingsScheduled(currentAccount!.address)
      currentAccount && (await fetchNotificationSubscriptions())

      setLastScheduledMeeting(meeting)
      logEvent('Scheduled a meeting', {
        fromPublicCalendar: true,
        participantsSize: meeting.participants.length,
      })
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
      } else if (e instanceof InvalidURL) {
        toast({
          title: 'Failed to schedule meeting',
          description: 'Please provide a valid url/link for your meeting.',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof Huddle01ServiceUnavailable) {
        toast({
          title: 'Failed to create video meeting',
          description:
            'Huddle01 seems to be offline. Please select a custom meeting link, or try again.',
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
    setLastScheduledMeeting(undefined)
    setTimeout(() => setReset(false), 200)
  }

  const updateSelfSlots = async () => {
    if (currentAccount) {
      const monthStart = startOfMonth(currentMonth)
      const monthEnd = endOfMonth(currentMonth)

      try {
        const busySlots = await getBusySlots(
          currentAccount!.address,
          monthStart,
          monthEnd
        )
        setSelfBusyslots(busySlots)
        setCheckedSelfSlots(true)
      } catch (e) {}
    }
  }

  const updateSlots = async () => {
    updateSelfSlots()
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
        if (teamMeetingRequest!.team_structure.type === GroupMeetingType.TEAM) {
          // to be implemented
        } else {
          accounts = teamMeetingRequest!.team_structure.participants_accounts!
        }

        const busySlots = await fetchBusySlotsForMultipleAccounts(
          accounts,
          monthStart,
          monthEnd,
          teamMeetingRequest!.team_structure.relationship
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
      return
    }

    setCheckingSlots(false)
  }

  useEffect(() => {
    updateSlots()
  }, [currentMonth])

  const changeType = (typeId: string) => {
    const type = account!
      .preferences!.availableTypes.filter(type => !type.deleted)
      .find(t => t.id === typeId)!
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
        teamMeetingRequest!.range_end &&
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

      if (
        teamMeetingRequest!.team_structure.relationship ===
        ConditionRelation.AND
      ) {
        for (const eachAccount of groupAccounts) {
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
      } else {
        for (const eachAccount of groupAccounts) {
          if (
            isSlotAvailable(
              teamMeetingRequest!.duration_in_minutes,
              0,
              slot,
              busySlots,
              eachAccount.preferences!.availabilities,
              Intl.DateTimeFormat().resolvedOptions().timeZone,
              eachAccount!.preferences!.timezone
            )
          ) {
            return true
          }
        }
        return false
      }
    }
  }

  const textToDisplayDateRange = () => {
    if (calendarType === CalendarType.TEAM) {
      if (teamMeetingRequest?.range_end) {
        return `Pick a time between ${format(
          new Date(teamMeetingRequest!.range_start),
          'PPPpp'
        )} and ${format(new Date(teamMeetingRequest!.range_end), 'PPPpp')}`
      } else if (isFuture(new Date(teamMeetingRequest!.range_start))) {
        return `Pick a time after ${format(
          new Date(teamMeetingRequest!.range_start),
          'PPPpp'
        )}`
      }
    }
    return null
  }

  const selfAvailabilityCheck = (slot: Date): boolean => {
    let duration
    let minAdvanceTime

    if (calendarType === CalendarType.REGULAR) {
      duration = selectedType.duration
      minAdvanceTime = selectedType.minAdvanceTime
    } else {
      duration = teamMeetingRequest!.duration_in_minutes
      minAdvanceTime = 0
    }

    return isSlotAvailable(
      duration,
      minAdvanceTime,
      slot,
      selfBusySlots,
      currentAccount!.preferences!.availabilities,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      currentAccount!.preferences!.timezone
    )
  }

  const dateRangeText = textToDisplayDateRange()

  return (
    <>
      <HeadMeta
        account={account}
        teamMeetingRequest={teamMeetingRequest}
        url={url}
      />
      <Container maxW="7xl" mt={32} mb={8} flex={1}>
        {!lastScheduledMeeting ? (
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
                  <GroupScheduleCalendarProfile teamAccounts={groupAccounts} />
                )}
                {calendarType === CalendarType.REGULAR && !rescheduleSlotId && (
                  <>
                    <Select
                      isDisabled={readyToSchedule}
                      placeholder="Select option"
                      mt={8}
                      value={selectedType.id}
                      onChange={e =>
                        e.target.value && changeType(e.target.value)
                      }
                    >
                      {account!
                        .preferences!.availableTypes.filter(
                          type =>
                            !type.deleted && (!type.private || isPrivateType)
                        )
                        .map(type => (
                          <option key={type.id} value={type.id}>
                            {type.title ? `${type.title} - ` : ''}
                            {durationToHumanReadable(type.duration)}
                          </option>
                        ))}
                    </Select>
                    {selectedType.description && (
                      <Text p={2}>{selectedType.description}</Text>
                    )}
                  </>
                )}

                {CalendarType.REGULAR === calendarType &&
                !rescheduleSlotId &&
                selectedType.scheduleGate ? (
                  <TokenGateValidation
                    gate={selectedType.scheduleGate}
                    targetAccount={account!}
                    userAccount={currentAccount!}
                    setIsGateValid={setIsGateValid}
                    isGateValid={isGateValid!}
                  />
                ) : null}
                {dateRangeText && (
                  <Text textAlign="center" mt={4}>
                    {dateRangeText}
                  </Text>
                )}

                {calendarType === CalendarType.REGULAR && rescheduleSlotId && (
                  <RescheduleInfoBox
                    loading={!rescheduleSlot}
                    slot={rescheduleSlot}
                  />
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
                            end: new Date(
                              teamMeetingRequest.range_end || '2999-01-01'
                            ),
                          }
                        : undefined
                    }
                    blockedDates={blockedDates}
                    preferences={account?.preferences}
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
                    selfAvailabilityCheck={selfAvailabilityCheck}
                    showSelfAvailability={checkedSelfSlots}
                    isGateValid={isGateValid!}
                    notificationsSubs={notificationsSubs}
                  />
                </Box>
              )}
            </Flex>
          </Box>
        ) : isSSR ? null : (
          <Flex justify="center">
            <MeetingScheduledDialog
              participants={lastScheduledMeeting!.participants}
              schedulerAccount={currentAccount!}
              scheduleType={schedulingType}
              meeting={lastScheduledMeeting}
              accountNotificationSubs={notificationsSubs}
              hasConnectedCalendar={hasConnectedCalendar}
              reset={_onClose}
            />
          </Flex>
        )}
      </Container>
    </>
  )
}

const RescheduleInfoBox: React.FC<{
  loading: boolean
  slot?: DBSlot
}> = ({ loading, slot }) => {
  return (
    <Flex p={4} mt={4}>
      {loading ? (
        <Spinner margin="auto" />
      ) : (
        <Box>
          <Text>
            <b>Former time</b>
          </Text>
          <Text>
            {dateToHumanReadable(
              new Date(slot!.start),
              Intl.DateTimeFormat().resolvedOptions().timeZone,
              false
            )}
          </Text>
          <Text>{Intl.DateTimeFormat().resolvedOptions().timeZone}</Text>

          <Text mt={2}>
            Select another time for the meeting, or{' '}
            <Button variant="link" colorScheme="primary">
              cancel
            </Button>{' '}
            it
          </Text>
        </Box>
      )}
    </Flex>
  )
}

const HeadMeta: React.FC<{
  account?: Account
  teamMeetingRequest?: GroupMeetingRequest
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
